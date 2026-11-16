// Package config loads runtime configuration from the environment.
package config

import "os"

const defaultPort = "8080"

// Config holds the server's runtime configuration.
type Config struct {
	Port string
}

// Load reads configuration from environment variables, applying defaults.
func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	return Config{Port: port}
}
