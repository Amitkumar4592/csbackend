import sys
import json
import cv2
import numpy as np
from ultralytics import YOLO

# Load YOLOv8 model
model = YOLO("yolov8n.pt")

def recommend_farming_techniques(vacant_area, sunlight, water):
    """ Recommend multiple farming techniques based on vacant area, sunlight, and water availability """
    
    recommendations = []

    if vacant_area < 10000:  # Small spaces (balconies, small terraces)
        if sunlight == "High Sunlight":
            if water == "Directly Available":
                recommendations = [
                    "Hydroponics (NFT System)",
                    "Wall-mounted Vertical Gardening",
                    "Container Gardening with Self-Watering Planters"
                ]
            elif water == "Indirectly Available":
                recommendations = [
                    "Drip Irrigation Vertical Gardening",
                    "Soil-based Container Gardening with Water Storage"
                ]
            else:
                recommendations = [
                    "Drought-resistant Gardening (Succulents, Cacti)",
                    "Aeroponic Small-scale Farming"
                ]
        
        elif sunlight == "Partial Shade":
            if water == "Directly Available":
                recommendations = [
                    "Shade-loving Microgreens in Hydroponics",
                    "Mushroom Cultivation (Button Mushrooms, Oyster Mushrooms)"
                ]
            elif water == "Indirectly Available":
                recommendations = [
                    "Container Gardening with Water Transport System",
                    "Soil-less Indoor Vertical Farming"
                ]
            else:
                recommendations = ["Limited Farming (Only Shade-Tolerant Low-Water Plants)"]
        
        else:  # Full Shade
            if water == "Directly Available":
                recommendations = [
                    "Indoor Hydroponics with Artificial Lighting",
                    "Mushroom Farming (Controlled Environment)"
                ]
            elif water == "Indirectly Available":
                recommendations = ["Controlled Environment Farming (LED-assisted Farming)"]
            else:
                recommendations = ["Not suitable for direct farming"]

    elif vacant_area < 50000:  # Medium spaces (large terraces, community spaces)
        if sunlight == "High Sunlight":
            if water == "Directly Available":
                recommendations = [
                    "Container Gardening (Soil-based, Hydroponic)",
                    "Raised Bed Gardening with Composting",
                    "Aquaponics with Tilapia or Catfish"
                ]
            elif water == "Indirectly Available":
                recommendations = [
                    "Drip Irrigation with Rainwater Collection",
                    "Vertical Farming with Recycled Water"
                ]
            else:
                recommendations = ["Drought-resistant Gardening (Desert Plants, Cactus Farming)"]
        
        elif sunlight == "Partial Shade":
            if water == "Directly Available":
                recommendations = [
                    "Low-light Hydroponics (Deep Water Culture - DWC)",
                    "Indoor Microgreens Farming"
                ]
            elif water == "Indirectly Available":
                recommendations = [
                    "Soil-less Farming with Water Transport",
                    "Hydroponic NFT with Water Storage Tanks"
                ]
            else:
                recommendations = ["Limited Farming (Only Shade-Tolerant Plants)"]
        
        else:  # Full Shade
            if water == "Directly Available":
                recommendations = [
                    "Mushroom Farming (Climate-controlled)",
                    "Indoor Gardening with Grow Lights"
                ]
            elif water == "Indirectly Available":
                recommendations = ["Advanced Indoor Hydroponics"]
            else:
                recommendations = ["Not suitable for direct farming"]

    else:  # Large vacant area (50,000 - 100,000+ sq. units)
        if sunlight == "High Sunlight":
            if water == "Directly Available":
                recommendations = [
                    "Full-scale Terrace Farming (Soil-based)",
                    "Aquaponics (Lettuce, Tilapia, Catfish)",
                    "Rainwater Harvesting with Integrated Farming"
                ]
            elif water == "Indirectly Available":
                recommendations = [
                    "Drip Irrigation with Large Water Storage",
                    "Permaculture Techniques (Food Forest Setup)"
                ]
            else:
                recommendations = ["Drought-resistant Large-Scale Farming (Millets, Sorghum)"]
        
        elif sunlight == "Partial Shade":
            if water == "Directly Available":
                recommendations = [
                    "Shade-tolerant Hydroponics (Lettuce, Herbs)",
                    "Indoor Greenhouse with Automated Irrigation"
                ]
            elif water == "Indirectly Available":
                recommendations = [
                    "Controlled Shade Farming with Water Transport",
                    "Advanced Indoor Vertical Farming"
                ]
            else:
                recommendations = ["Limited Farming (Only Shade-Tolerant Plants)"]
        
        else:  # Full Shade
            if water == "Directly Available":
                recommendations = [
                    "Mushroom Farming in Climate-Controlled Units",
                    "Indoor Hydroponics with LED Grow Lights"
                ]
            elif water == "Indirectly Available":
                recommendations = ["Automated Indoor Farming Systems"]
            else:
                recommendations = ["Not suitable for direct farming"]

    return recommendations

def detect_objects(image_path, sunlight, water):
    """ Runs YOLOv8 object detection and calculates vacant space """

    # Load image
    image = cv2.imread(image_path)

    # Run YOLOv8 inference
    results = model(image, verbose=False)

    detected_objects = []
    for result in results:
        for box in result.boxes:
            obj = {
                "name": model.names[int(box.cls[0])],  
                "confidence": float(box.conf[0]),  
                "bounding_box": {
                    "x1": int(box.xyxy[0][0]),
                    "y1": int(box.xyxy[0][1]),
                    "x2": int(box.xyxy[0][2]),
                    "y2": int(box.xyxy[0][3]),
                },
            }
            detected_objects.append(obj)

    # Calculate vacant area
    height, width, _ = image.shape
    total_area = width * height
    detected_area = sum(
        (obj["bounding_box"]["x2"] - obj["bounding_box"]["x1"]) * 
        (obj["bounding_box"]["y2"] - obj["bounding_box"]["y1"])
        for obj in detected_objects
    )
    vacant_area = total_area - detected_area
    vacant_percentage = (vacant_area / total_area) * 100

    # Get farming recommendations
    recommendations = recommend_farming_techniques(vacant_area, sunlight, water)

    # Construct JSON output
    output = {
        "message": "Detection completed",
        "vacant_area": vacant_area,
        "vacant_percentage": vacant_percentage,
        "sunlight": sunlight,
        "water_availability": water,
        "farming_recommendations": recommendations,
        "detected_objects": detected_objects
    }

    # 🔴 REMOVE ANY PRINT STATEMENTS EXCEPT JSON OUTPUT
    print(json.dumps(output, indent=4))  

if __name__ == "__main__":
    image_path = sys.argv[1]
    sunlight = sys.argv[2]
    water = sys.argv[3]
    
    detect_objects(image_path, sunlight, water)
