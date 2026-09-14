using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Windows.Forms;
using Autodesk.Navisworks.Api;
using Autodesk.Navisworks.Api.Plugins;

namespace ProjectControls.NavisworksExporter
{
    [Plugin("ProjectControlsWebBundle", "PCVW", ToolTip = "Export stable BIM metadata for the Project Controls GitHub Viewer")]
    public class ProjectControlsWebBundle : AddInPlugin
    {
        public override int Execute(params string[] parameters)
        {
            var doc = Autodesk.Navisworks.Api.Application.ActiveDocument;
            if (doc == null || doc.Models.Count == 0)
            {
                MessageBox.Show("Open a Navisworks model first.", "Project Controls Exporter");
                return 0;
            }
            using var dlg = new FolderBrowserDialog { Description = "Choose output folder for metadata JSON" };
            if (dlg.ShowDialog() != DialogResult.OK) return 0;

            var modelKey = Path.GetFileNameWithoutExtension(doc.CurrentFileName ?? "NavisworksModel");
            var exporter = new ExportModel();
            var index = 0;
            var root = doc.Models.RootItem;
            Traverse(root, "", ref index, exporter.Objects);
            exporter.ModelKey = modelKey;
            exporter.Name = modelKey;
            exporter.Version = DateTime.Now.ToString("yyyyMMdd-HHmmss");
            exporter.SourceFile = doc.CurrentFileName;
            exporter.ExportedUtc = DateTime.UtcNow;

            var jsonPath = Path.Combine(dlg.SelectedPath, "model-metadata.json");
            File.WriteAllText(jsonPath, JsonSerializer.Serialize(exporter, new JsonSerializerOptions { WriteIndented = true }));
            File.WriteAllText(Path.Combine(dlg.SelectedPath, "manifest.json"), JsonSerializer.Serialize(new Manifest
            {
                SchemaVersion = 1,
                ModelKey = exporter.ModelKey,
                Metadata = "model-metadata.json",
                Geometry = "model.glb",
                SourceFile = exporter.SourceFile,
                ExportedUtc = exporter.ExportedUtc
            }, new JsonSerializerOptions { WriteIndented = true }));

            MessageBox.Show($"Metadata exported.\n\n{jsonPath}\n\nNext: use Navisworks Output > Export Scene > FBX, convert that local FBX to GLB, and place the GLB in the same folder as manifest.json.", "Project Controls Exporter");
            return 0;
        }

        private static void Traverse(ModelItem item, string parentPath, ref int index, List<ModelObject> output)
        {
            if (item == null) return;
            var name = SafeName(item);
            var path = string.IsNullOrEmpty(parentPath) ? name : parentPath + "/" + name;
            var hasGeometry = item.HasGeometry;
            if (hasGeometry)
            {
                output.Add(new ModelObject
                {
                    ObjectId = StableId(item),
                    NodeIndex = index++,
                    Name = name,
                    Path = path,
                    Properties = ReadProperties(item)
                });
            }
            foreach (ModelItem child in item.Children) Traverse(child, path, ref index, output);
        }

        private static string StableId(ModelItem item)
        {
            // InstanceGuid is preferred when exposed by the current Navisworks API.
            // Reflection keeps the exporter compatible with API versions that differ.
            var prop = item.GetType().GetProperty("InstanceGuid");
            var value = prop?.GetValue(item, null)?.ToString();
            if (!string.IsNullOrWhiteSpace(value) && value != Guid.Empty.ToString()) return value;
            return item.GetHashCode().ToString("X") + "-" + SafeName(item);
        }
        private static string SafeName(ModelItem item)
        {
            var p = item.GetType().GetProperty("DisplayName");
            var s = p?.GetValue(item, null)?.ToString();
            return string.IsNullOrWhiteSpace(s) ? "ModelItem" : s;
        }
        private static Dictionary<string,string> ReadProperties(ModelItem item)
        {
            var d = new Dictionary<string,string>();
            foreach (PropertyCategory cat in item.PropertyCategories)
                foreach (DataProperty p in cat.Properties)
                {
                    var key = $"{cat.DisplayName}.{p.DisplayName}";
                    d[key] = p.Value == null ? "" : p.Value.ToDisplayString();
                }
            return d;
        }
    }

    public class ExportModel { public string ModelKey {get;set;} public string Name {get;set;} public string Version {get;set;} public string SourceFile {get;set;} public DateTime ExportedUtc {get;set;} public List<ModelObject> Objects {get;set;} = new(); }
    public class ModelObject { public string ObjectId {get;set;} public int NodeIndex {get;set;} public string Name {get;set;} public string Path {get;set;} public Dictionary<string,string> Properties {get;set;} = new(); }
    public class Manifest { public int SchemaVersion {get;set;} public string ModelKey {get;set;} public string Metadata {get;set;} public string Geometry {get;set;} public string SourceFile {get;set;} public DateTime ExportedUtc {get;set;} }
}
