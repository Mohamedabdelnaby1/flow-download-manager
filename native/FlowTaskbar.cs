using System;
using System.Runtime.InteropServices;

// Windows' native progress indicator; failure is non-fatal on shells without it.
internal static class FlowTaskbar {
 [ComImport,Guid("56FDF344-FD6D-11d0-958A-006097C9A090")] class Taskbar {}
 [ComImport,Guid("EA1AFB91-9E28-4B86-90E9-9E9F8A5EEFAF"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface ITaskbarList3 {
  void HrInit(); void AddTab(IntPtr w); void DeleteTab(IntPtr w); void ActivateTab(IntPtr w); void SetActiveAlt(IntPtr w);
  void MarkFullscreenWindow(IntPtr w,[MarshalAs(UnmanagedType.Bool)]bool full);
  void SetProgressValue(IntPtr w,ulong done,ulong total);void SetProgressState(IntPtr w,uint state);
 }
 static ITaskbarList3 Instance;
 internal static void Progress(IntPtr window,bool running,double done,double total) {
  try {if(Instance==null){Instance=(ITaskbarList3)new Taskbar();Instance.HrInit();}
   Instance.SetProgressState(window,!running?0u:total>0?2u:1u);
   if(running&&total>0)Instance.SetProgressValue(window,(ulong)Math.Max(0,Math.Min(total,done)),(ulong)total);
  } catch {}
 }
}
