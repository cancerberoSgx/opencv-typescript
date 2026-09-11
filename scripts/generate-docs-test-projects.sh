rm -rf pages/code-editor
mkdir -p pages/code-editor
cd test-projects/code-editor
rm -rf dist
npm i
npm run build
cp -r dist/* ../pages/code-editor
cd ..


