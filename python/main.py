import sys
import cv2
import os
import time
from datetime import datetime
import numpy as np
import json

# Backend related
from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
from multiprocessing import Queue
from threading import Thread

# Import Openpose
sys.path.append('libs/openpose/build/python')
from openpose import pyopenpose as op

# Setup custom params
params = dict()
params["model_folder"] = "libs/openpose/models/"

# Starting OpenPose
opWrapper = op.WrapperPython()
opWrapper.configure(params)
opWrapper.start()

# Setup task execution queue
task_queue = Queue()
completion_dict = {}

def add_generation_task(in_file, task_key):
    task_queue.put((in_file, task_key))

def run_tasks_from_queue():
    global completion_dict
    global task_queue
    global opWrapper

    while True:
        datum = op.Datum()
        in_file, task_key = task_queue.get()
        print('Worker received task {}'.format(task_key))
        input_image = cv2.imread(in_file)
        datum.cvInputData = input_image
        opWrapper.emplaceAndPop([datum])
        completion_dict[task_key] = datum.poseKeypoints

thread = Thread(target=run_tasks_from_queue)
thread.start()

# Setup Flask app
flask_app = Flask(__name__)
CORS(flask_app)

# Estimate pose
@flask_app.route('/pose', methods=['POST'])
def estimate_pose():
    f = request.files['image']
    save_path = os.path.join(os.getcwd(), 'input_files')
    save_filename = os.path.join(save_path, f.filename)
    if not os.path.exists(save_path):
        os.makedirs(save_path)
    print('Saving image file to {}'.format(save_filename))
    f.save(os.path.join('input_files', save_filename))

    task_key = 'task_{}'.format(datetime.now().strftime('%Y-%m-%d_%H%M%S_%f'))
    completion_dict[task_key] = None
    add_generation_task(save_filename, task_key)
    while completion_dict[task_key] is None:
        time.sleep(0.01)

    res = completion_dict[task_key]
    completion_dict.pop(task_key, None)

    if len(res.shape) < 3:
        print(res.shape)
        return jsonify({})

    # DEBUG

    img_copy = cv2.imread(save_filename)
    img_copy = cv2.cvtColor(img_copy, cv2.COLOR_BGR2RGB)
    for ix in range(res.shape[1]):
        coords = res[0, ix, :2]
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(img_copy, '{}'.format(ix), 
                    (int(coords[0]), int(coords[1])),
                    font,
                    1,(0,0,255),1,cv2.LINE_AA)
    
    cv2.imwrite('text.jpg', img_copy)

    # END DEBUG

    res = (res[0, :, :2] / np.array(img_copy.shape[:2])).tolist()

    formatted_res = {
        "keypoints": {
            "nose": res[0],
            "chest": res[1],
            "leftShoulder": res[2],
            "leftElbow": res[3],
            "leftWrist": res[4],
            "rightShoulder": res[5],
            "rightElbow": res[6],
            "rightWrist": res[7],
            "center": res[8],
            "leftHip": res[9],
            "leftKnee": res[10],
            "leftAnkle": res[11],
            "rightHip": res[12],
            "rightKnee": res[13],
            "rightAnkle": res[14],
            "leftEye": res[15],
            "rightEye": res[16],
            "leftEar": res[17],
            "rightEar": res[18]
        },
        "input_filename": f.filename
    }

    return jsonify(formatted_res)

@flask_app.route('/exercise/pose/<demo_id>', methods=['GET'])
def get_demo_pose(demo_id):
    with open('data/poses.json', 'r') as f:
        json_obj = json.load(f)
    return jsonify(json_obj[demo_id])

if __name__ == '__main__':
    flask_app.run(host='0.0.0.0', port=8081)
