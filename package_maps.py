import os
import tarfile
import json
from datetime import datetime

def package_map():
    filtered_file = "zimbabwe-roads.osm.pbf"
    output_tar = "zimbabwe-roads.tar.gz"
    manifest_file = "maps.json"

    if not os.path.exists(filtered_file):
        print(f"Error: {filtered_file} was not generated.")
        return

    print(f"Compressing {filtered_file} into {output_tar}...")
    with tarfile.open(output_tar, "w:gz") as tar:
        tar.add(filtered_file, arcname=os.path.basename(filtered_file))
    
    file_size_mb = round(os.path.getsize(output_tar) / (1024 * 1024), 2)
    print(f"Package created successfully! Size: {file_size_mb} MB")

    manifest_data = {"countries": {}}
    if os.path.exists(manifest_file):
        with open(manifest_file, "r") as f:
            try:
                manifest_data = json.load(f)
            except json.JSONDecodeError:
                pass

    manifest_data["countries"]["zimbabwe"] = {
        "version": datetime.utcnow().strftime("%Y-%m-%d"),
        "size_mb": file_size_mb,
        "url": f"https://yourapp.com{output_tar}"
    }

    with open(manifest_file, "w") as f:
        json.dump(manifest_data, indent=2)
    print("maps.json manifest updated.")

if __name__ == "__main__":
    package_map()

