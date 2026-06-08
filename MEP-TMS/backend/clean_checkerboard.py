from PIL import Image

def clean_checkerboard(img_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    
    data = img.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # Calculate saturation / difference between channels
        channel_diff = max(r, g, b) - min(r, g, b)
        
        # If the pixel is greyish (checkerboard) or near-white/near-grey
        # We also want to handle light background shades
        if channel_diff < 50 or (r > 200 and g > 200 and b > 200):
            # Make it fully transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(img_path, "PNG")
    print(f"Successfully cleaned checkerboard background from {img_path}.")

if __name__ == "__main__":
    clean_checkerboard("d:/GitRepos/Designathon/MEP-TMS/frontend-vite/public/hexaware-favicon.png")
