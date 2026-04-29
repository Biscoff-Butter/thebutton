import cv2
import numpy as np

# Red placeholder
red_img = np.zeros((500, 500, 3), dtype=np.uint8)
red_img[:] = (36, 36, 179) # BGR for #b32424
cv2.imwrite('red.png', red_img)

# Blue placeholder
blue_img = np.zeros((500, 500, 3), dtype=np.uint8)
blue_img[:] = (184, 104, 59) # BGR for #3b68b8
cv2.imwrite('blue.png', blue_img)
