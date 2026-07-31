import re
import unittest
from pathlib import Path


TOOLS = Path(__file__).resolve().parent


class DeploymentConfigTests(unittest.TestCase):
    def test_scripts_share_one_site_id_and_deploy_passes_site_explicitly(self):
        common = (TOOLS / "netlify-site.ps1").read_text(encoding="utf-8-sig")
        deploy = (TOOLS / "deploy.ps1").read_text(encoding="utf-8-sig")
        builds = (TOOLS / "set_builds.ps1").read_text(encoding="utf-8-sig")

        site_ids = re.findall(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
            common + deploy + builds,
        )
        self.assertEqual(site_ids, ["b798737f-59ef-4a3a-801d-727b80edf1c4"])
        self.assertIn('"--site=$($NetlifySite.Id)"', deploy)
        self.assertIn('Get-VerifiedNetlifySite "netlify"', deploy)
        self.assertIn('Join-Path $PSScriptRoot "netlify-site.ps1"', deploy)
        self.assertIn('Join-Path $PSScriptRoot "netlify-site.ps1"', builds)


if __name__ == "__main__":
    unittest.main()
