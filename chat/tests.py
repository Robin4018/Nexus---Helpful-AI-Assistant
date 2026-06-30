from django.test import TestCase

class SimpleTest(TestCase):
    def test_math_works(self):
        self.assertEqual(1 + 1, 2)
