import io, os, sys, tempfile, unittest, urllib.error
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "job"))
import triathlon_api as api  # noqa: E402

KEY = "test-key-0123456789abcdef"  # fixture value, not a real key


class TriathlonApiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "triathlon_api_key")

    def tearDown(self):
        self.tmp.cleanup()

    def key_file(self, content=KEY + "\n", mode=0o600):
        with open(self.path, "w", encoding="utf-8") as f:
            f.write(content)
        os.chmod(self.path, mode)
        return self.path

    def assert_refused(self, needle):
        with self.assertRaises(api.ApiKeyError) as cm:
            api.load_key(self.path)
        self.assertIn(needle, str(cm.exception))
        self.assertNotIn(KEY, str(cm.exception))

    def test_default_location_outside_repo(self):
        repo = os.path.realpath(os.path.join(HERE, ".."))
        self.assertTrue(api.KEY_FILE.endswith(os.path.join(".config", "il2la28", "triathlon_api_key")))
        self.assertFalse(os.path.realpath(api.KEY_FILE).startswith(repo))

    def test_reads_key_from_600_file(self):
        self.assertEqual(api.load_key(self.key_file()), KEY)

    def test_missing_file_has_no_fallback(self):
        with mock.patch.dict(os.environ, {"TRIATHLON_API_KEY": KEY, "APIKEY": KEY}):
            self.assert_refused("no API key file")

    def test_permissions_and_content_refused(self):
        for mode in (0o644, 0o640, 0o604):
            self.key_file(mode=mode)
            self.assert_refused("chmod 600")
        for content in ("", "  \n", "two words\n", KEY + "\n" + KEY + "\n"):
            self.key_file(content)
            self.assert_refused("single line")

    def test_symlink_refused(self):
        real = self.key_file()
        link = os.path.join(self.tmp.name, "link")
        os.symlink(real, link)
        with self.assertRaises(api.ApiKeyError) as cm:
            api.load_key(link)
        self.assertIn("regular file", str(cm.exception))

    def test_key_only_in_header(self):
        req = api.request("/events/123/programs/4/results", {"per_page": 10}, key_file=self.key_file())
        self.assertEqual(req.get_header("Apikey"), KEY)
        self.assertNotIn(KEY, req.full_url)
        self.assertTrue(req.full_url.startswith("https://api.triathlon.org/v1/events/123"))
        with self.assertRaises(ValueError):
            api.request("https://evil.example/x", key_file=self.path)

    def test_errors_never_carry_the_key(self):
        self.key_file()
        err = urllib.error.HTTPError("https://api.triathlon.org/v1/events/1", 401, "Unauthorized",
                                     {"apikey": KEY}, io.BytesIO(KEY.encode()))
        for exc in (err, urllib.error.URLError("dns " + KEY), TimeoutError()):
            with mock.patch("urllib.request.urlopen", side_effect=exc):
                with self.assertRaises(api.ApiError) as cm:
                    api.program_results(1, 2, key_file=self.path)
            self.assertNotIn(KEY, str(cm.exception))
            self.assertIsNone(cm.exception.__cause__)

    def test_results_parsed(self):
        self.key_file()
        body = io.BytesIO(b'{"data": {"results": [{"athlete_noc": "ISR", "position": 3}]}}')
        with mock.patch("urllib.request.urlopen", return_value=body) as m:
            out = api.program_results("10", "20", key_file=self.path)
        self.assertEqual(out["data"]["results"][0]["athlete_noc"], "ISR")
        self.assertTrue(m.call_args[0][0].full_url.endswith("/events/10/programs/20/results"))


if __name__ == "__main__":
    unittest.main()
