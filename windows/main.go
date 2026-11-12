// מעיין — תוכנת התקנה למחשב Windows בלי אינטרנט.
// מעתיקה את האפליקציה לתיקייה קבועה, יוצרת קיצורי דרך עם אייקון ופותחת אותה.
package main

import (
	_ "embed"
	"encoding/base64"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unicode/utf16"
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

// קיצור דרך אמיתי (lnk) דרך PowerShell, שמטפל בשמות משתמש בעברית; אם נכשל — קובץ url
func shortcut(dir, target, icon string) {
	if dir == "" {
		return
	}
	link := filepath.Join(dir, "מעיין.lnk")
	q := func(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }
	script := "$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut(" + q(link) + ");$s.TargetPath=" + q(target) +
		";$s.IconLocation=" + q(icon+",0") + ";$s.Description='מעיין — יומן טהרת המשפחה';$s.Save()"
	enc := utf16.Encode([]rune(script))
	raw := make([]byte, len(enc)*2)
	for i, c := range enc {
		raw[2*i], raw[2*i+1] = byte(c), byte(c>>8)
	}
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", base64.StdEncoding.EncodeToString(raw))
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if cmd.Run() == nil {
		if _, err := os.Stat(link); err == nil {
			return
		}
	}
	url := "[InternetShortcut]\r\nURL=file:///" + filepath.ToSlash(target) + "\r\nIconFile=" + icon + "\r\nIconIndex=0\r\n"
	os.WriteFile(filepath.Join(dir, "מעיין.url"), []byte(url), 0o644)
}

func main() {
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
	shortcut(folder(csidlDesktop), page, icon)
	shortcut(folder(csidlPrograms), page, icon)

	if update {
		message("מעיין עודכנה לגרסה החדשה.\nהרישומים ביומן נשמרו.", mbIconInfo)
	} else {
		message("מעיין הותקנה.\n\nמעכשיו פותחים אותה מהאייקון \"מעיין\" בשולחן העבודה או בתפריט התחל.\nלא צריך חיבור לאינטרנט, והיומן נשמר רק במחשב הזה.", mbIconInfo)
	}
	shExec.Call(0, uintptr(unsafe.Pointer(u16("open"))), uintptr(unsafe.Pointer(u16(page))), 0, 0, 1)
}
