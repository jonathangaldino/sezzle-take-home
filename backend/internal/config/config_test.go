package config

import "testing"

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
