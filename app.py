# app.py
from flask import Flask, request, jsonify, send_from_directory
import math
import os

app = Flask(__name__, static_folder='static', static_url_path='')

INSIDE = 0
LEFT   = 1
RIGHT  = 2
BOTTOM = 4
TOP    = 8

def compute_out_code(x, y, xmin, ymin, xmax, ymax):
    code = INSIDE
    if x < xmin:    code |= LEFT
    elif x > xmax:  code |= RIGHT
    if y < ymin:    code |= BOTTOM
    elif y > ymax:  code |= TOP
    return code

def cohen_sutherland_clip(x1, y1, x2, y2, xmin, ymin, xmax, ymax):
    outcode1 = compute_out_code(x1, y1, xmin, ymin, xmax, ymax)
    outcode2 = compute_out_code(x2, y2, xmin, ymin, xmax, ymax)
    accept = False

    while True:
        if outcode1 == 0 and outcode2 == 0:
            accept = True
            break
        elif (outcode1 & outcode2) != 0:
            break
        else:
            outcode_out = outcode1 if outcode1 != 0 else outcode2
            if outcode_out & TOP:
                # y = ymax
                x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1) if (y2 - y1) != 0 else x1
                y = ymax
            elif outcode_out & BOTTOM:
                x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1) if (y2 - y1) != 0 else x1
                y = ymin
            elif outcode_out & RIGHT:
                y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1) if (x2 - x1) != 0 else y1
                x = xmax
            elif outcode_out & LEFT:
                y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1) if (x2 - x1) != 0 else y1
                x = xmin

            # replace the outside point with intersection
            if outcode_out == outcode1:
                x1, y1 = x, y
                outcode1 = compute_out_code(x1, y1, xmin, ymin, xmax, ymax)
            else:
                x2, y2 = x, y
                outcode2 = compute_out_code(x2, y2, xmin, ymin, xmax, ymax)

    if accept:
        return True, (x1, y1, x2, y2)
    else:
        return False, None

def inside(p, edge, clip_rect):
    x, y = p
    xmin, ymin, xmax, ymax = clip_rect
    if edge == 'left':   return x >= xmin
    if edge == 'right':  return x <= xmax
    if edge == 'bottom': return y >= ymin
    if edge == 'top':    return y <= ymax
    return True

def intersection(p1, p2, edge, clip_rect):
    x1, y1 = p1
    x2, y2 = p2
    xmin, ymin, xmax, ymax = clip_rect
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return p1
    if edge == 'left':
        x = xmin
        if dx == 0:
            return (x, y1)
        t = (xmin - x1) / dx
        y = y1 + t * dy
        return (x, y)
    if edge == 'right':
        x = xmax
        if dx == 0:
            return (x, y1)
        t = (xmax - x1) / dx
        y = y1 + t * dy
        return (x, y)
    if edge == 'bottom':
        y = ymin
        if dy == 0:
            return (x1, y)
        t = (ymin - y1) / dy
        x = x1 + t * dx
        return (x, y)
    if edge == 'top':
        y = ymax
        if dy == 0:
            return (x1, y)
        t = (ymax - y1) / dy
        x = x1 + t * dx
        return (x, y)
    return None

def sutherland_hodgman(subject_polygon, clip_rect):
    edges = ['left', 'right', 'bottom', 'top']
    output_list = subject_polygon[:]
    for edge in edges:
        input_list = output_list[:]
        output_list = []
        if not input_list:
            break
        S = input_list[-1]
        for E in input_list:
            if inside(E, edge, clip_rect):
                if inside(S, edge, clip_rect):
                    output_list.append(E)
                else:
                    inter = intersection(S, E, edge, clip_rect)
                    output_list.append(inter)
                    output_list.append(E)
            else:
                if inside(S, edge, clip_rect):
                    inter = intersection(S, E, edge, clip_rect)
                    output_list.append(inter)
            S = E
    return [(round(x,6), round(y,6)) for x,y in output_list]

@app.route('/api/clip', methods=['POST'])
def api_clip():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Expected JSON body."}), 400
    segments = data.get('segments', [])
    polygon = data.get('polygon', [])
    window = data.get('window', None)
    if window is None:
        return jsonify({"error": "No window provided."}), 400
    xmin, ymin, xmax, ymax = window

    clipped_segments = []
    for seg in segments:
        x1,y1,x2,y2 = seg
        visible, res = cohen_sutherland_clip(x1,y1,x2,y2, xmin,ymin,xmax,ymax)
        if visible:
            clipped_segments.append(list(res))

    clipped_polygon = []
    if polygon:
        clipped_polygon = sutherland_hodgman(polygon, (xmin,ymin,xmax,ymax))

    return jsonify({
        "clipped_segments": clipped_segments,
        "clipped_polygon": clipped_polygon
    })

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
