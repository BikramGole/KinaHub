import subprocess, sys, os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from sellers.models import Store

SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'scripts')

class Command(BaseCommand):
    help = "Seed all stores and products idempotently"

    def handle(self, *args, **options):
        if Store.objects.count() > 5:
            self.stdout.write(self.style.SUCCESS(f"Stores already exist ({Store.objects.count()}), skipping seed"))
            return

        scripts = [
            ('seed_dukan.py', False),
            ('seed_clothes.py', False),
            ('seed_groceries.py', False),
        ]

        for script, _ in scripts:
            path = os.path.join(SCRIPTS_DIR, script)
            if os.path.exists(path):
                self.stdout.write(f"Running {script}...")
                result = subprocess.run(
                    [sys.executable, '-c', f'import os; os.environ["DJANGO_SETTINGS_MODULE"] = "core.settings"; os.chdir({os.path.dirname(SCRIPTS_DIR)!r}); exec(open({path!r}).read())'],
                    capture_output=True, text=True, timeout=300,
                )
                if result.stdout:
                    self.stdout.write(result.stdout)
                if result.returncode or result.stderr:
                    self.stderr.write(self.style.WARNING(f"{script} stderr: {result.stderr[:500]}"))

        call_command('seed_spacex')

        self.stdout.write(self.style.SUCCESS("All seeds complete"))
