// מעיין — תוכנת התקנה למחשב Windows בלי אינטרנט.
// מעתיקה את האפליקציה לתיקייה קבועה, יוצרת קיצורי דרך עם אייקון ופותחת אותה.
package main

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"unsafe"
)

//go:embed maayan.html
var appHTML []byte

//go:embed maayan.ico
var appIcon []byte

var (
	user32  = syscall.NewLazyDLL("user32.dll")
	shell32 = syscall.NewLazyDLL("shell32.dll")
	msgBox  = user32.NewProc("MessageBoxW")
	getPath = shell32.NewProc("SHGetFolderPathW")
	shExec  = shell32.NewProc("ShellExecuteW")
)

const (
	csidlDesktop  = 0x10 // שולחן העבודה של המשתמש (כולל OneDrive)
	csidlPrograms = 0x02 // תפריט התחל ← תוכניות
	mbOK          = 0x0
	mbIconInfo    = 0x40
	mbIconError   = 0x10
	mbRTL         = 0x00100000 | 0x00080000
)

func u16(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }

func message(text string, icon uintptr) {
	msgBox.Call(0, uintptr(unsafe.Pointer(u16(text))), uintptr(unsafe.Pointer(u16("מעיין"))), mbOK|icon|mbRTL)
}

func folder(csidl uintptr) string {
	buf := make([]uint16, 520)
	r, _, _ := getPath.Call(0, csidl, 0, 0, uintptr(unsafe.Pointer(&buf[0])))
	if r != 0 {
		return ""
	}
	return syscall.UTF16ToString(buf)
}

type guid struct {
	d1     uint32
	d2, d3 uint16
	d4     [8]byte
}

var (
	ole32          = syscall.NewLazyDLL("ole32.dll")
	coInit         = ole32.NewProc("CoInitializeEx")
	coCreate       = ole32.NewProc("CoCreateInstance")
	clsidShellLink = guid{0x00021401, 0, 0, [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}
	iidShellLinkW  = guid{0x000214F9, 0, 0, [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}
	iidPersistFile = guid{0x0000010B, 0, 0, [8]byte{0xC0, 0, 0, 0, 0, 0, 0, 0x46}}
)

// קריאה לפונקציה בטבלת ה-COM של אובייקט
func vcall(obj uintptr, idx int, args ...uintptr) uintptr {
	vtbl := *(*uintptr)(unsafe.Pointer(obj))
	fn := *(*uintptr)(unsafe.Pointer(vtbl + uintptr(idx)*unsafe.Sizeof(uintptr(0))))
	r, _, _ := syscall.SyscallN(fn, append([]uintptr{obj}, args...)...)
	return r
}

// קיצור דרך lnk דרך IShellLinkW — עובד עם נתיבים ושמות בעברית בכל שפת Windows
func createLink(link, target, icon, desc string) error {
	var sl uintptr
	if hr, _, _ := coCreate.Call(uintptr(unsafe.Pointer(&clsidShellLink)), 0, 1, uintptr(unsafe.Pointer(&iidShellLinkW)), uintptr(unsafe.Pointer(&sl))); hr != 0 || sl == 0 {
		return fmt.Errorf("CoCreateInstance 0x%x", hr)
	}
	defer vcall(sl, 2)
	if hr := vcall(sl, 20, uintptr(unsafe.Pointer(u16(target)))); hr != 0 {
		return fmt.Errorf("SetPath 0x%x", hr)
	}
	vcall(sl, 9, uintptr(unsafe.Pointer(u16(filepath.Dir(target)))))
	vcall(sl, 7, uintptr(unsafe.Pointer(u16(desc))))
	vcall(sl, 17, uintptr(unsafe.Pointer(u16(icon))), 0)
	var pf uintptr
	if hr := vcall(sl, 0, uintptr(unsafe.Pointer(&iidPersistFile)), uintptr(unsafe.Pointer(&pf))); hr != 0 || pf == 0 {
		return fmt.Errorf("QueryInterface 0x%x", hr)
	}
	defer vcall(pf, 2)
	if hr := vcall(pf, 6, uintptr(unsafe.Pointer(u16(link))), 1); hr != 0 {
		return fmt.Errorf("Save 0x%x", hr)
	}
	return nil
}

// קיצור דרך עם אייקון; אם נכשל — קובץ url
func shortcut(dir, target, icon string) {
	if dir == "" {
		return
	}
	link := filepath.Join(dir, "מעיין.lnk")
	err := createLink(link, target, icon, "מעיין — יומן טהרת המשפחה")
	logf("lnk %s: %v", link, err)
	if err == nil {
		if _, e := os.Stat(link); e == nil {
			return
		}
	}
	url := "[InternetShortcut]\r\nURL=file:///" + filepath.ToSlash(target) + "\r\nIconFile=" + icon + "\r\nIconIndex=0\r\n"
	werr := os.WriteFile(filepath.Join(dir, "מעיין.url"), []byte(url), 0o644)
	logf("url fallback %s: %v", dir, werr)
}

var logPath string

func logf(format string, a ...any) {
	if logPath == "" {
		return
	}
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	fmt.Fprintf(f, format+"\r\n", a...)
}

func main() {
	runtime.LockOSThread()
	coInit.Call(0, 2)
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
	}
	dir := filepath.Join(base, "Maayan")
	page := filepath.Join(dir, "maayan.html")
	icon := filepath.Join(dir, "maayan.ico")
	_, statErr := os.Stat(page)
	update := statErr == nil

	if err := os.MkdirAll(dir, 0o755); err != nil {
		message("ההתקנה נכשלה: לא ניתן ליצור את התיקייה\n"+dir, mbIconError)
		return
	}
	if err := os.WriteFile(page, appHTML, 0o644); err != nil {
		message("ההתקנה נכשלה: לא ניתן לשמור את האפליקציה.\nאם מעיין פתוחה בדפדפן, יש לסגור אותה ולנסות שוב.", mbIconError)
		return
	}
	os.WriteFile(icon, appIcon, 0o644)
	logPath = filepath.Join(dir, "install.log")
	os.Remove(logPath)
	logf("desktop=%q programs=%q", folder(csidlDesktop), folder(csidlPrograms))
	shortcut(folder(csidlDesktop), page, icon)
	shortcut(folder(csidlPrograms), page, icon)

	if update {
		message("מעיין עודכנה לגרסה החדשה.\nהרישומים ביומן נשמרו.", mbIconInfo)
	} else {
		message("מעיין הותקנה.\n\nמעכשיו פותחים אותה מהאייקון \"מעיין\" בשולחן העבודה או בתפריט התחל.\nלא צריך חיבור לאינטרנט, והיומן נשמר רק במחשב הזה.", mbIconInfo)
	}
	shExec.Call(0, uintptr(unsafe.Pointer(u16("open"))), uintptr(unsafe.Pointer(u16(page))), 0, 0, 1)
}
