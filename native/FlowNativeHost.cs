using System;
using System.IO;
using System.Text;
using System.Net;
using System.Diagnostics;
using System.Threading;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using System.Runtime.InteropServices;

// Chrome Native Messaging host. Stdout is reserved exclusively for framed JSON.
class FlowNativeHost {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct StartupInfo { public int cb; public string reserved, desktop, title; public int x,y,xSize,ySize,xCountChars,yCountChars,fillAttribute,flags; public short showWindow,reserved2; public IntPtr reservedPtr,stdInput,stdOutput,stdError; }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr process,thread; public int processId,threadId; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, StringBuilder command, IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, int creationFlags, IntPtr environment, string directory, ref StartupInfo startup, out ProcessInfo info);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 1024 * 1024 };
  static string root = AppDomain.CurrentDomain.BaseDirectory;
  static string configFile = Path.Combine(root, "host-config.json");
  static Dictionary<string, object> config;
  static string token;
  static byte[] ReadBytes(Stream input, int length) {
    byte[] data = new byte[length]; int n = 0;
    while (n < length) { int read = input.Read(data, n, length - n); if (read == 0) { if (n == 0) return null; throw new IOException("Incomplete native message"); } n += read; }
    return data;
  }
  static string Value(Dictionary<string, object> obj, string key) { return obj.ContainsKey(key) ? Convert.ToString(obj[key]) : ""; }
  static void Write(Stream output, object value) {
    byte[] bytes = Encoding.UTF8.GetBytes(json.Serialize(value));
    if (bytes.Length > 1024 * 1024) throw new IOException("Response too large");
    byte[] size = BitConverter.GetBytes(bytes.Length); output.Write(size, 0, 4); output.Write(bytes, 0, bytes.Length); output.Flush();
  }
  static object Request(string type, Dictionary<string, object> message) {
    Uri address;
    if (!Uri.TryCreate(Value(config, "address"), UriKind.Absolute, out address) || address.Scheme != "http" || address.Host != "127.0.0.1") throw new Exception("Invalid local address");
    string endpoint = type == "ping" ? "/extension/ping" : "/extension/add";
    byte[] body = Encoding.UTF8.GetBytes(json.Serialize(message));
    var request = (HttpWebRequest)WebRequest.Create(new Uri(address, endpoint));
    request.Method = "POST"; request.Proxy = null; request.ContentType = "application/json"; request.Timeout = 35000; request.ReadWriteTimeout = 10000;
    request.Headers["Origin"] = "chrome-extension://" + Value(config, "extensionId"); request.Headers["x-flow-token"] = token;
    request.ContentLength = body.Length;
    using (Stream s = request.GetRequestStream()) s.Write(body, 0, body.Length);
    using (var response = request.GetResponse()) using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8)) return json.DeserializeObject(reader.ReadToEnd());
  }
  static void Launch() {
    string executable = Value(config, "executable");
    if (!File.Exists(executable)) throw new Exception("Flow executable was moved. Open Flow and set up browser integration again.");
    // A background desktop must not inherit the browser's framed stdio pipes.
    var startup = new StartupInfo(); startup.cb = Marshal.SizeOf(startup); startup.flags = 1; startup.showWindow = 0;
    ProcessInfo info;
    if (!CreateProcess(executable, new StringBuilder("\"" + executable + "\" " + Value(config, "arguments")), IntPtr.Zero, IntPtr.Zero, false, 0x208, IntPtr.Zero, Path.GetDirectoryName(executable), ref startup, out info)) throw new Exception("Could not start Flow: " + Marshal.GetLastWin32Error());
    CloseHandle(info.process); CloseHandle(info.thread);
  }
  static void Main(string[] args) {
    if (args.Length > 0 && args[0] == "--configure") {
      try {
        config = json.Deserialize<Dictionary<string, object>>(Console.In.ReadToEnd());
        string secret = Value(config, "token"); config.Remove("token");
        config["protectedToken"] = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(secret), null, DataProtectionScope.CurrentUser));
        File.WriteAllText(configFile, json.Serialize(config), new UTF8Encoding(false));
      } catch { Environment.ExitCode = 1; } return;
    }
    Stream input = Console.OpenStandardInput(), output = Console.OpenStandardOutput();
    try {
      config = json.Deserialize<Dictionary<string, object>>(File.ReadAllText(configFile));
      if (args.Length < 1 || args[0].TrimEnd('/') != "chrome-extension://" + Value(config, "extensionId")) throw new Exception("Untrusted extension origin");
      token = Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(Value(config, "protectedToken")), null, DataProtectionScope.CurrentUser));
      while (true) {
        byte[] size = ReadBytes(input, 4); if (size == null) return;
        int length = BitConverter.ToInt32(size, 0); if (length < 2 || length > 512 * 1024) throw new Exception("Invalid native message length");
        byte[] payload = ReadBytes(input, length); if (payload == null) return;
        try {
          var message = json.Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(payload)); string type = Value(message, "type");
          if (type != "ping" && type != "download") throw new Exception("Unsupported native command");
          object result = null;
          try { result = Request(type, message); }
          catch (WebException ex) {
            if (ex.Response != null) { using (var reader = new StreamReader(ex.Response.GetResponseStream())) throw new Exception(reader.ReadToEnd()); }
            Launch();
            for (int attempt = 0; attempt < 100; attempt++) {
              Thread.Sleep(150);
              try { result = Request(type, message); break; }
              catch (WebException retry) { if (retry.Response != null) { using (var reader = new StreamReader(retry.Response.GetResponseStream())) throw new Exception(reader.ReadToEnd()); } }
            }
            if (result == null) throw new Exception("Flow did not start. Open the app and test the connection again.");
          }
          Write(output, result);
        } catch (Exception ex) { Write(output, new { error = ex.Message }); }
      }
    } catch (Exception ex) { try { Write(output, new { error = ex.Message }); } catch { } }
  }
}
