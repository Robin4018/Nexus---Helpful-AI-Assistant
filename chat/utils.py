import pypdf
import docx
import os
import json
from google.genai import types

def extract_text_from_file(file_path, file_type):
    """
    Given a local file path and a mime-type, extract readable text if it is a document.
    """
    text_content = ""
    try:
        ft = file_type.lower()
        if 'pdf' in ft or file_path.endswith('.pdf'):
            reader = pypdf.PdfReader(file_path)
            pages_text = []
            for i, page in enumerate(reader.pages):
                txt = page.extract_text()
                if txt:
                    pages_text.append(f"--- Page {i+1} ---\n{txt}")
            text_content = "\n\n".join(pages_text)
        elif 'wordprocessingml.document' in ft or file_path.endswith('.docx'):
            doc = docx.Document(file_path)
            paragraphs_text = [p.text for p in doc.paragraphs if p.text]
            text_content = "\n".join(paragraphs_text)
        elif 'msword' in ft or file_path.endswith('.doc'):
            text_content = "[Binary .doc file loaded. Direct text extraction is limited. Please use docx or pdf for best results.]"
        elif 'text/' in ft or file_path.endswith(('.txt', '.md', '.json', '.html', '.css', '.js')):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
        else:
            # General fallback check: try to read as utf-8 but don't crash
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
    except Exception as e:
        print(f"Error extracting text from file {file_path}: {e}")
        text_content = f"Error reading document context: {str(e)}"
    
    return text_content

def analyze_file_content(client, uploaded_file_obj):
    """
    Using the initialized Gemini Client, run a quick first-pass analysis on the uploaded file:
    - If it's an image, run OCR and visual description.
    - If it's a document, run a text summarizer under Gemini to find key topics & summary.
    Saves the output directly into the uploaded_file_obj in database.
    """
    if not client:
        uploaded_file_obj.extracted_text = "AI client not ready."
        uploaded_file_obj.summary = "Cannot analyze without AI client config."
        uploaded_file_obj.save()
        return

    file_path = uploaded_file_obj.file.path
    file_type = uploaded_file_obj.file_type.lower()
    file_name = uploaded_file_obj.file_name

    # 1. Handle Images (OCR & vision summary)
    if any(img_type in file_type for img_type in ['image/', 'jpeg', 'png', 'gif', 'tiff']):
        try:
            with open(file_path, 'rb') as f:
                image_bytes = f.read()

            prompt = (
                "Please analyze this user-uploaded image. Do two things in detail:\n"
                "1. Under a heading 'EXTRACTED TEXT / OCR', extract any text readable in the image verbatim.\n"
                "2. Under a heading 'IMAGE DETAILS', describe the contents, style, context, and key objects/elements of the image.\n"
                "Also, at the very end, output a JSON block wrapped in ```json ... ``` containing exactly:\n"
                "{\n"
                "  \"summary\": \"A short 1-sentence descriptor of what this image is.\",\n"
                "  \"topics\": [\"keyword1\", \"keyword2\", ...]\n"
                "}"
            )

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=file_type),
                    prompt
                ]
            )

            result_text = response.text or ""
            uploaded_file_obj.extracted_text = result_text
            
            # Try to parse the trailing JSON block for summary/topics
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                    parsed = json.loads(json_str)
                    uploaded_file_obj.summary = parsed.get("summary", f"Image: {file_name}")
                    uploaded_file_obj.topics = parsed.get("topics", ["Image", "Visual"])
                else:
                    uploaded_file_obj.summary = f"Visual analysis of image '{file_name}' done."
                    uploaded_file_obj.topics = ["Image", "OCR"]
            except Exception:
                uploaded_file_obj.summary = f"Visual analysis of image '{file_name}'."
                uploaded_file_obj.topics = ["Image"]

        except Exception as e:
            uploaded_file_obj.extracted_text = f"Failed image parsing: {str(e)}"
            uploaded_file_obj.summary = f"Image '{file_name}' processing error."
            uploaded_file_obj.topics = ["Error"]

    # 2. Handle Documents (PDF, Docx, Text, Markdown)
    else:
        # Extract text first
        text = extract_text_from_file(file_path, file_type)
        uploaded_file_obj.extracted_text = text if text else "Empty text extracted."
        
        if len(text.strip()) > 0:
            try:
                # Truncate request to safety limits (e.g. first 20,000 characters) to keep summarization fast
                text_preview = text[:20000]
                prompt = (
                    f"You are analyzing an uploaded document named: '{file_name}'.\n"
                    f"First 20,000 characters of text:\n{text_preview}\n\n"
                    "Generate a JSON structure summarizing the main aspects of this document. "
                    "Return ONLY valid JSON. Response must contain two fields: 'summary' (a brief 1-2 sentence overview of the file) and 'topics' (a list of 3-7 core topics or entities)."
                )

                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )

                response_data = response.text or "{}"
                parsed = json.loads(response_data)
                uploaded_file_obj.summary = parsed.get("summary", "Document compiled and extracted.")
                uploaded_file_obj.topics = parsed.get("topics", ["Document"])
            except Exception as e:
                print(f"Error building document summary: {e}")
                uploaded_file_obj.summary = "Text content extracted. Detailed AI summary unavailable due to timeout/error."
                uploaded_file_obj.topics = ["Document"]
        else:
            uploaded_file_obj.summary = "No text content detected in this file."
            uploaded_file_obj.topics = ["Empty File"]

    uploaded_file_obj.save()
