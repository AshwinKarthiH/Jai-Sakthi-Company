import os
import subprocess
import shutil

print("1. Force closing MongoDB Compass...")
os.system('taskkill /F /IM MongoDBCompass.exe >nul 2>&1')

roaming_dir = os.path.join(os.environ.get('APPDATA', ''), 'MongoDB Compass')
print(f"2. Clearing corrupted cache at: {roaming_dir}")
if os.path.exists(roaming_dir):
    try:
        shutil.rmtree(roaming_dir)
        print("   -> Cache cleared successfully!")
    except Exception as e:
        print(f"   -> Could not completely clear cache (might be locked): {e}")
else:
    print("   -> Cache already clean.")

local_appdata = os.environ.get('LOCALAPPDATA', '')
exe_path = os.path.join(local_appdata, r"MongoDBCompass\MongoDBCompass.exe")
print(f"3. Launching MongoDB Compass safely...")

if os.path.exists(exe_path):
    # Launch completely detached
    subprocess.Popen([exe_path, "--disable-gpu"], 
                     creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_CONSOLE | subprocess.CREATE_NO_WINDOW)
    print("\n✅ Done! Compass should be opening on your screen right now.")
else:
    print(f"❌ Could not find the executable at {exe_path}")
