sudo rm -rf opencv-compiler/output/
rm -rf opencv-ts/
cd opencv-compiler/
./build.sh 
cd ../opencv-types-generator/

pip install -e .
opencv-types-generator