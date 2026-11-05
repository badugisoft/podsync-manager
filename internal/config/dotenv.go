package config

import (
	"bufio"
	"log"
	"os"
	"strings"
)

// LoadDotEnv loads environment variables from the given file path if it exists.
// It skips comments (#) and empty lines, and preserves existing environment variables.
func LoadDotEnv(filePath string) {
	f, err := os.Open(filePath)
	if err != nil {
		return // File does not exist, ignore silently
	}
	defer f.Close()

	loadedCount := 0
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Strip surrounding single or double quotes
		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}

		// Only set if not already set in process environment
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
			loadedCount++
		}
	}

	if loadedCount > 0 {
		log.Printf("Loaded %d environment variables from %s", loadedCount, filePath)
	}
}
