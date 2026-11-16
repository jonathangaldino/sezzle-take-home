package config

import (
	"os"
	"testing"
)

func TestLoad(t *testing.T) {
	tests := []struct {
		name string
		port string
		want string
	}{
		{name: "unset PORT uses default", port: "", want: "8080"},
		{name: "PORT overrides default", port: "9090", want: "9090"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// An empty value is treated like an unset one by Load.
			t.Setenv("PORT", tt.port)
			if got := Load().Port; got != tt.want {
				t.Errorf("Load().Port = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestLoadCalcLogFile(t *testing.T) {
	t.Run("unset uses default", func(t *testing.T) {
		t.Setenv("CALC_LOG_FILE", "") // registers restoration of the original value
		os.Unsetenv("CALC_LOG_FILE")
		if got := Load().CalcLogFile; got != "calculations.log" {
			t.Errorf("Load().CalcLogFile = %q, want calculations.log", got)
		}
	})
	t.Run("set overrides default", func(t *testing.T) {
		t.Setenv("CALC_LOG_FILE", "/var/log/calc.log")
		if got := Load().CalcLogFile; got != "/var/log/calc.log" {
			t.Errorf("Load().CalcLogFile = %q, want /var/log/calc.log", got)
		}
	})
	t.Run("empty disables", func(t *testing.T) {
		t.Setenv("CALC_LOG_FILE", "")
		if got := Load().CalcLogFile; got != "" {
			t.Errorf("Load().CalcLogFile = %q, want empty", got)
		}
	})
}
