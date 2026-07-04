import os
import urllib.request
import sys

def check_and_download_compass():
    # Common installation paths for MongoDB Compass
    user_profile = os.environ.get('USERPROFILE', '')
    paths_to_check = [
        r"C:\Program Files\MongoDB\Compass",
        os.path.join(user_profile, r"AppData\Local\MongoDBCompass")
    ]
    
    found = False
    for path in paths_to_check:
        if os.path.exists(path):
            print(f"✅ MongoDB Compass is already installed at: {path}")
            print("You can search for 'MongoDB Compass' in your Windows Start Menu to open it.")
            found = True
            break
            
    if not found:
        print("❌ MongoDB Compass is not found on your system.")
        download_url = "https://downloads.mongodb.com/compass/mongodb-compass-1.43.0-win32-x64.exe"
        installer_path = os.path.join(os.getcwd(), "mongodb-compass-installer.exe")
        
        print(f"⬇️ Downloading MongoDB Compass to your current folder...")
        print(f"Please wait, this might take a minute...")
        
        try:
            urllib.request.urlretrieve(download_url, installer_path)
            print(f"\n✅ Download complete!")
            print(f"The installer is saved as: {installer_path}")
            print(f"👉 Please double-click 'mongodb-compass-installer.exe' in your project folder to install it.")
        except Exception as e:
            print(f"⚠️ Failed to download: {e}")
            print(f"Please manually download it from: {download_url}")

if __name__ == "__main__":
    check_and_download_compass()
