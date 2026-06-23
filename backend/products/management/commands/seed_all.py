import os, sys
from django.core.management.base import BaseCommand
from django.core.management import call_command
from products.models import Product

SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'scripts')
EXPECTED_PRODUCT_COUNT = 440

def _exec_script(script_path, label):
    """Run a seed script in-process via exec."""
    with open(script_path) as f:
        code = f.read()
    old_cwd = os.getcwd()
    os.chdir(os.path.dirname(script_path))
    try:
        exec(code, {'__name__': '__main__', '__file__': script_path, '__builtins__': __builtins__})
    except SystemExit:
        pass
    finally:
        os.chdir(old_cwd)

class Command(BaseCommand):
    help = "Seed all stores and products idempotently"

    def handle(self, *args, **options):
        count = Product.objects.count()
        if count < EXPECTED_PRODUCT_COUNT:
            self.stdout.write(f"Products: {count}, expected ~{EXPECTED_PRODUCT_COUNT}, running seeds...")

            for script in ('seed_dukan.py', 'seed_clothes.py', 'seed_groceries.py'):
                path = os.path.join(SCRIPTS_DIR, script)
                if os.path.exists(path):
                    self.stdout.write(f"Running {script}...")
                    try:
                        _exec_script(path, script)
                    except Exception as e:
                        self.stderr.write(self.style.ERROR(f"{script} failed: {e}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Core products exist ({count}), skipping core seed"))

        self.stdout.write("Ensuring SpaceX store is seeded...")
        call_command('seed_spacex')
        self.stdout.write(self.style.SUCCESS(f"Seeding done. Total products: {Product.objects.count()}"))
