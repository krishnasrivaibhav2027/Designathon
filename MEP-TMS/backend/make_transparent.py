from PIL import Image

def make_white_transparent(img_path):
    img = Image.open(img_path)
    img = img.convert("RGBA")
    
    data = img.getdata()
    new_data = []
    for item in data:
        # Check if pixel is close to white (R, G, B all > 230)
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            # Make it fully transparent
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(img_path, "PNG")
    print(f"Successfully processed and made {img_path} transparent.")

if __name__ == "__main__":
    make_white_transparent("d:/GitRepos/Designathon/MEP-TMS/frontend-vite/public/hexaware-favicon.png")
