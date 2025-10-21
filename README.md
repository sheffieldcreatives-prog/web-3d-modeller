```markdown
# Browser AI 3D Modeller (client-side)

A small, fully client-side 3D modeller demo that runs entirely in the browser and is ready to host on GitHub Pages.

Features
- Add primitives: cubes, spheres, planes
- Material editing: change colors and basic textures
- AI placeholders (client-side heuristics):
  - Generate simple 3D objects from text prompts (house, tree, lamp, fallback)
  - Generate from image input (creates textured primitives based on average color)
- Scene management: multiple objects, selection, transform controls (translate/rotate/scale)
- Export: .glb (binary) and .obj
- Local storage: save/load scene JSON to localStorage, import/export JSON

How to use (locally)
1. Open `index.html` in a modern browser (Chrome/Edge/Firefox).
2. Use the left sidebar to add primitives and use the viewport to select and manipulate objects.
3. Use the AI text input or upload an image to generate example objects.
4. Export GLB or OBJ from the header buttons; you can also download/import a JSON scene.
5. Save to localStorage for quick persistence.

Deploy to GitHub Pages
1. Create a new repository on GitHub and push these files to the `main` branch.
2. In repository settings -> Pages, set the source to the `main` branch (root).
3. After a minute, your site will be available at `https://<your-username>.github.io/<repo-name>/`.

Notes and limitations
- The "AI" features are placeholders implemented with simple heuristics and image sampling — there is intentionally no ML model or backend in this demo.
- Exporters are client-side and may have limitations for complex scenes.
- This project is a starting point; extend it with model libraries, better editor UIs, persistent cloud storage, or real AI generation (if you add a backend).

License
- MIT
```
