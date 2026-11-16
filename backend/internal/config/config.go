// Package config loads runtime configuration from the environment.
package config

import "os"

const (
	defaultPort        = "8080"
	defaultCalcLogFile = "calculations.log"
)

// Config holds the server's runtime configuration.
type Config struct {
	Port string
	// CalcLogFile is the calculation log path; empty disables the log.
	CalcLogFile string
}

// Load reads configuration from environment variables, applying defaults.
func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	// Unlike PORT, an empty CALC_LOG_FILE is meaningful: it disables the log.
	calcLogFile, ok := os.LookupEnv("CALC_LOG_FILE")
	if !ok {
		calcLogFile = defaultCalcLogFile
	}
	return Config{Port: port, CalcLogFile: calcLogFile}
}
