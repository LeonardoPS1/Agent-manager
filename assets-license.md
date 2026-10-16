# Assets License

Aicore Office uses only CC0/MIT licensed assets as specified.

## 3D Models & Characters

| Asset pack | Author | License | Source |
| --- | --- | --- | --- |
| Universal Base Characters `[Standard]` | Quaternius | CC0-1.0 | https://quaternius.com/ |
| Universal Animation Library `[Standard]` | Quaternius | CC0-1.0 | https://quaternius.com/ |
| KayKit Adventurers 2.0 FREE | Kay Lousberg (KayKit) | CC0-1.0 | https://kaylousberg.com/ |
| KayKit Character Animations 1.1 | Kay Lousberg (KayKit) | CC0-1.0 | https://kaylousberg.com/ |
| Mini Characters | Kenney | CC0-1.0 | https://kenney.nl/ |
| Furniture Kit, UI | Kenney | CC0-1.0 | https://kenney.nl/ |

Each pack ships its own `License.txt`, kept next to the assets it covers. A
curated subset of these packs (~26 MB, only the files the catalog references) is
committed to this repository; the full archives are not. See the "Asset packs"
section of the README for the folder layout and the `npm run models:scan` helper.

Two local changes were applied to the committed Quaternius `.gltf` files: their
`images[].uri` entries pointed at `T_*_Normal_png.png` files that do not exist in
the upstream pack (the real names are `T_*_Normal.png`), and textures were
downscaled for the web. No geometry, rig or texture content was altered.

## Optimization Tools
- **gltfpack** - MIT - https://github.com/zeux/meshoptimizer/tree/master/gltfpack
- **Draco compression** - Apache 2.0 - https://github.com/google/draco

All assets included in this project must comply with the above licenses.
When adding new assets, ensure they are CC0 or MIT licensed.
