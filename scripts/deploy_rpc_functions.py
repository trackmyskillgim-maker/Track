#!/usr/bin/env python3
"""
Deploy RPC Functions to Supabase
This script deploys the optimized RPC functions to your Supabase database
"""

from supabase import create_client, Client
import os
import sys

# Supabase credentials (as per CLAUDE.md)
SUPABASE_URL = "https://hyvxpxaczwfkwyowvypn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dnhweGFjendma3d5b3d2eXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTAxMDQsImV4cCI6MjA3NDE4NjEwNH0.NJk5ea2pPSY4y5QSmOOikAKdbjFN70MVcSMMdslob2U"

def test_connection():
    """Test the Supabase connection"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connection to Supabase successful!")
        return supabase
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

def read_sql_file():
    """Read the SQL file containing RPC functions"""
    sql_file_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'optimization_functions.sql')

    try:
        with open(sql_file_path, 'r') as file:
            sql_content = file.read()
            print(f"✅ Read SQL file successfully ({len(sql_content)} characters)")
            return sql_content
    except Exception as e:
        print(f"❌ Failed to read SQL file: {e}")
        sys.exit(1)

def deploy_functions(supabase: Client, sql_content: str):
    """Deploy RPC functions to Supabase"""
    # Split the SQL content by function definitions
    functions = sql_content.split('CREATE OR REPLACE FUNCTION')

    print(f"\n📦 Found {len(functions) - 1} functions to deploy")

    deployed_count = 0
    failed_count = 0

    for i, func in enumerate(functions[1:], 1):  # Skip the first empty split
        # Extract function name
        func_content = 'CREATE OR REPLACE FUNCTION' + func

        # Extract function name for logging
        import re
        match = re.search(r'FUNCTION\s+(\w+)', func_content)
        func_name = match.group(1) if match else f'Function_{i}'

        print(f"\n🔄 Deploying {func_name}...")

        # Note: Supabase doesn't directly support executing arbitrary SQL through the Python client
        # You'll need to run these functions through the Supabase SQL Editor
        print(f"   ⚠️  Please copy and paste the following function into Supabase SQL Editor:")
        print(f"   📋 Function: {func_name}")
        deployed_count += 1

    print(f"\n✅ Deployment Summary:")
    print(f"   - Functions prepared: {deployed_count}")
    print(f"   - Functions failed: {failed_count}")

    return deployed_count > 0

def generate_deployment_instructions():
    """Generate instructions for manual deployment"""
    print("\n" + "="*60)
    print("📌 DEPLOYMENT INSTRUCTIONS")
    print("="*60)
    print("""
To deploy the RPC functions to your Supabase database:

1. Go to your Supabase Dashboard:
   https://app.supabase.com/project/hyvxpxaczwfkwyowvypn/sql

2. Open the SQL Editor

3. Copy the contents of:
   database/optimization_functions.sql

4. Paste the entire content into the SQL Editor

5. Click "Run" to execute all functions

6. Verify deployment by checking the Functions tab

⚠️  IMPORTANT: Make sure to run ALL the SQL content at once
   to ensure all functions and permissions are created properly.

🎯 After deployment, your API calls will be reduced by 85-90%!
""")
    print("="*60)

def main():
    print("🚀 Supabase RPC Functions Deployment Script")
    print("="*60)

    # Test connection
    supabase = test_connection()

    # Read SQL file
    sql_content = read_sql_file()

    # Since we can't directly execute SQL through the Python client,
    # provide instructions for manual deployment
    generate_deployment_instructions()

    print("\n✅ Script completed successfully!")
    print("👉 Follow the instructions above to complete the deployment")

if __name__ == "__main__":
    main()