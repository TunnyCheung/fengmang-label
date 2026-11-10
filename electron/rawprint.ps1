param(
  [Parameter(Mandatory = $true)][string]$Printer,
  [Parameter(Mandatory = $true)][string]$File,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
}

function Send-Json($payload) {
  [Console]::Out.WriteLine(($payload | ConvertTo-Json -Compress -Depth 4))
}

function Fail([string]$message) {
  Send-Json @{ ok = $false; error = $message }
  exit 1
}

if (-not $Printer) {
  Fail 'Printer name is empty'
}

if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
  Fail "File not found: $File"
}

$info = New-Object System.IO.FileInfo($File)
$byteCount = [int64]$info.Length

if ($byteCount -le 0) {
  Fail "File is empty: $File"
}

if ($DryRun) {
  Send-Json @{ ok = $true; dryRun = $true; bytes = $byteCount }
  exit 0
}

$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefaults);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    private const int ChunkSize = 32768;

    public static string NormalizePrinterName(string name)
    {
        if (name == null) return "";
        return name.Trim().Trim('"');
    }

    public static int Send(string printerName, byte[] data, string documentName)
    {
        string name = NormalizePrinterName(printerName);
        if (name.Length == 0)
            throw new ArgumentException("Printer name is empty");

        IntPtr handle;
        if (!OpenPrinter(name, out handle, IntPtr.Zero))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter failed for '" + name + "'");

        bool docStarted = false;
        bool pageStarted = false;
        try
        {
            DOCINFOA di = new DOCINFOA();
            di.pDocName = string.IsNullOrEmpty(documentName) ? "Fengmang Label" : documentName;
            di.pOutputFile = null;
            di.pDataType = "RAW";

            int jobId = StartDocPrinter(handle, 1, di);
            if (jobId <= 0)
                throw new Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter failed");
            docStarted = true;

            if (!StartPagePrinter(handle))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter failed");
            pageStarted = true;

            int offset = 0;
            while (offset < data.Length)
            {
                int count = Math.Min(ChunkSize, data.Length - offset);
                IntPtr buffer = Marshal.AllocHGlobal(count);
                try
                {
                    Marshal.Copy(data, offset, buffer, count);
                    int written;
                    if (!WritePrinter(handle, buffer, count, out written))
                        throw new Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter failed");
                    if (written != count)
                        throw new Exception("WritePrinter wrote " + written + " of " + count + " bytes");
                }
                finally
                {
                    Marshal.FreeHGlobal(buffer);
                }
                offset += count;
            }

            if (!EndPagePrinter(handle))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "EndPagePrinter failed");
            pageStarted = false;

            if (!EndDocPrinter(handle))
                throw new Win32Exception(Marshal.GetLastWin32Error(), "EndDocPrinter failed");
            docStarted = false;

            return jobId;
        }
        finally
        {
            if (pageStarted) { try { EndPagePrinter(handle); } catch { } }
            if (docStarted) { try { EndDocPrinter(handle); } catch { } }
            ClosePrinter(handle);
        }
    }
}
'@

try {
  Add-Type -TypeDefinition $source -Language CSharp | Out-Null
  $bytes = [System.IO.File]::ReadAllBytes($info.FullName)
  $jobId = [RawPrinter]::Send($Printer, $bytes, $null)
  Send-Json @{ ok = $true; jobId = [int]$jobId }
  exit 0
} catch {
  Fail $_.Exception.Message
}
