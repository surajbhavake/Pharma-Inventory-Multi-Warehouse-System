"""
users/management/commands/seed_users.py - Management Command to Seed Test Users

Creates test users for all 4 roles with predefined credentials.

Usage:
    python manage.py seed_users
    python manage.py seed_users --clear  # Delete existing test users first
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User
from inventory.models import Warehouse


class Command(BaseCommand):
    help = 'Seed database with test users for all 4 roles'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing test users before seeding',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting user seeding...'))
        
        # Clear existing test users if requested
        if options['clear']:
            self.clear_test_users()
        
        # Create test users
        with transaction.atomic():
            users_created = self.create_test_users()
        
        # Display results
        self.display_results(users_created)
    
    def clear_test_users(self):
        """Delete existing test users"""
        self.stdout.write(self.style.WARNING('Clearing existing test users...'))
        
        test_emails = [
            'admin@pharma.com',
            'manager@pharma.com',
            'staff@pharma.com',
            'auditor@pharma.com',
        ]
        
        deleted_count = User.objects.filter(email__in=test_emails).delete()[0]
        
        if deleted_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {deleted_count} existing test users')
            )
    
    def create_test_users(self):
        """Create test users for all roles"""
        users_created = []
        
        # Create or get a test warehouse for managers
        warehouse = None
        if Warehouse.objects.exists():
            warehouse = Warehouse.objects.first()
        
        # Define test users
        test_users = [
            {
                'email': 'admin@pharma.com',
                'username': 'admin',
                'password': 'Admin123!',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'manager@pharma.com',
                'username': 'manager',
                'password': 'Manager123!',
                'first_name': 'Warehouse',
                'last_name': 'Manager',
                'role': 'warehouse_manager',
                'assigned_warehouse': warehouse,
            },
            {
                'email': 'staff@pharma.com',
                'username': 'staff',
                'password': 'Staff123!',
                'first_name': 'Staff',
                'last_name': 'User',
                'role': 'staff',
                'assigned_warehouse': warehouse,
            },
            {
                'email': 'auditor@pharma.com',
                'username': 'auditor',
                'password': 'Auditor123!',
                'first_name': 'Auditor',
                'last_name': 'User',
                'role': 'auditor',
            },
        ]
        
        # Create users
        for user_data in test_users:
            email = user_data['email']
            
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                self.stdout.write(
                    self.style.WARNING(f'⚠ User {email} already exists, skipping...')
                )
                continue
            
            # Create user
            password = user_data.pop('password')
            user = User.objects.create_user(**user_data)
            user.set_password(password)
            user.save()
            
            users_created.append({
                'email': email,
                'username': user.username,
                'role': user.role,
                'password': password  # Store for display
            })
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created {user.role}: {email}')
            )
        
        return users_created
    
    def display_results(self, users_created):
        """Display summary of created users"""
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('USER SEEDING COMPLETED'))
        self.stdout.write('=' * 70)
        
        if not users_created:
            self.stdout.write(
                self.style.WARNING('No new users created (all already exist)')
            )
            return
        
        self.stdout.write(f'\n✓ Created {len(users_created)} test users:\n')
        
        # Display credentials table
        self.stdout.write(
            self.style.HTTP_INFO(
                '┌─────────────────────────┬──────────────────────────┬─────────────────┐'
            )
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                '│ Email                   │ Password                 │ Role            │'
            )
        )
        self.stdout.write(
            self.style.HTTP_INFO(
                '├─────────────────────────┼──────────────────────────┼─────────────────┤'
            )
        )
        
        for user in users_created:
            email = user['email'].ljust(23)
            password = user['password'].ljust(24)
            role = user['role'].ljust(15)
            
            self.stdout.write(
                self.style.HTTP_INFO(
                    f'│ {email} │ {password} │ {role} │'
                )
            )
        
        self.stdout.write(
            self.style.HTTP_INFO(
                '└─────────────────────────┴──────────────────────────┴─────────────────┘'
            )
        )
        
        # Display usage instructions
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('USAGE INSTRUCTIONS'))
        self.stdout.write('=' * 70)
        self.stdout.write('\n1. Login via API:')
        self.stdout.write(
            '   curl -X POST http://localhost:8000/api/v1/auth/login/ \\\n'
            '     -H "Content-Type: application/json" \\\n'
            '     -d \'{"email":"admin@pharma.com","password":"Admin123!"}\'\n'
        )
        
        self.stdout.write('2. Access Swagger UI:')
        self.stdout.write('   http://localhost:8000/api/docs/\n')
        
        self.stdout.write('3. Access Django Admin:')
        self.stdout.write('   http://localhost:8000/admin/')
        self.stdout.write('   Login with: admin@pharma.com / Admin123!\n')
        
        self.stdout.write('=' * 70 + '\n')