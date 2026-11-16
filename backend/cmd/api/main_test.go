package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOpenCalcLog(t *testing.T) {
	dir := t.TempDir()

	t.Run("empty path disables", func(t *testing.T) {
		if f := openCalcLog(""); f != nil {
			f.Close()
			t.Error("openCalcLog(\"\") returned a file, want nil")
		}
	})

	t.Run("unopenable path degrades to nil", func(t *testing.T) {
		if f := openCalcLog(filepath.Join(dir, "missing-dir", "calc.log")); f != nil {
			f.Close()
			t.Error("openCalcLog returned a file for a path in a missing directory, want nil")
		}
	})

	t.Run("creates and appends", func(t *testing.T) {
		path := filepath.Join(dir, "calc.log")
		for _, line := range []string{"one\n", "two\n"} {
			f := openCalcLog(path)
			if f == nil {
				t.Fatal("openCalcLog returned nil for a writable path")
			}
			if _, err := f.WriteString(line); err != nil {
				t.Fatal(err)
			}
			f.Close()
		}
		got, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != "one\ntwo\n" {
			t.Errorf("file = %q, want %q", got, "one\ntwo\n")
		}
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if perm := info.Mode().Perm(); perm&^0o644 != 0 {
			t.Errorf("permissions = %o, want 0644 or tighter", perm)
		}
	})
}
