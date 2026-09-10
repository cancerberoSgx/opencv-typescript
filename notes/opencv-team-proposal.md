
I want to reply to opencv team in issue https://github.com/opencv/opencv/issues/15306#issuecomment-5427873322
that I have ready my contribution (this project) for the solution of generating typescript definitions from opencv sources for opencv.js

I want them to suggest the best way of adapting all of this to their code / organization / projects / workflows. I will be giving all this with any license description to them so they are free to adapt as feet

code README.md file explain how this works to compile opencv and extract types from scratch using these projects.
It also contains something worth mentioning which is the TODO versioning

Can you here write a response to them?. The url of this project is https://github.com/cancerberoSgx/opencv-typescript

A.


Hi all,

I've put together a working solution for generating TypeScript definitions for opencv.js from the OpenCV sources, and wanted to share it here in case it's useful to the project:

https://github.com/cancerberoSgx/opencv-typescript

It's a small pipeline of three parts, meant to go from a clean OpenCV checkout all the way to a publishable .d.ts-only package:

1. opencv-compiler — clones a specific OpenCV version and builds opencv.js together with the XML documentation (Doxygen output), which the generator needs as its source of truth. Only requirement is Docker.
2. opencv-types-generator — takes the build output from opencv-compiler and generates the actual TypeScript definitions.
3. opencv-ts — the resulting npm package: 100% generated types, zero runtime code, ready to npm install in any TypeScript project.

There's also a test-projects folder with sample TypeScript projects (web and Node.js, with a couple of different bundlers) exercising the generated types to make sure they actually work in practice.

The README at the root of the repo walks through the whole process of compiling OpenCV and extracting the types from scratch using these three projects, so it should be reproducible end-to-end.

One thing worth flagging up front: Right now the generator targets OpenCV 5.x. Tried targeting older versions like 4.x but although types are generated correctly there could be some more testing or different "hacks" for each particular version. That's the main known gap, but I don't think hard to resolve.

I'm offering this whole thing — code, approach, and license — for the OpenCV project to adapt as you see fit. I don't have a strong opinion on where it should live or how it should plug into your existing workflows, so I'd really appreciate your guidance on the best way to fold this in: e.g. as a subfolder/tool in the main opencv or opencv.js repo, as a separate org-owned repo, wired into your existing CI/build pipeline for opencv.js, published under an official npm scope, etc. Happy to adjust the license, structure, or CI setup to whatever fits best with how the project is organized.

Let me know what would be most useful and I'll get it into shape.

(It's a rewrite of my previously mentioned [doxygen2typescript project](https://github.com/cancerberoSgx/mirada/tree/master/doxygen2typescript) just focusing on opencv.js ts types.)