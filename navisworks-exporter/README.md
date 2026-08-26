# Navisworks Web Bundle Exporter

This is a separate **C# Navisworks plugin** used only to prepare a local BIM workspace for the GitHub-hosted Project Controls Viewer.

## Runtime architecture

- The GitHub Pages application never opens NWD/NWC directly.
- Navisworks remains the authoring/review tool.
- This plugin exports **stable metadata** (`model-metadata.json`) and a `manifest.json`.
- Geometry is exported locally using **Navisworks Output → Export Scene → FBX**, then converted locally to `model.glb` with the converter of your choice.
- The browser opens the resulting local `model.glb` and metadata together.

## Build

1. Install Visual Studio with .NET Framework 4.8 targeting pack.
2. Install the matching Navisworks Manage/Simulate SDK/API.
3. Define the MSBuild property `NAVISWORKS_API` to the folder containing `Autodesk.Navisworks.Api.dll`.
4. Build Release.
5. Copy the compiled DLL into the Navisworks Plugins folder for your version.

## Notes

The Autodesk API surface varies slightly between releases. The exporter intentionally uses reflection for stable object identity where API versions expose different members. Validate against your target Navisworks release before production deployment.
