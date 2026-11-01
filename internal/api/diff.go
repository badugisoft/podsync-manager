package api

import "strings"

type DiffLine struct {
	Type string `json:"type"` // "added" | "removed" | "unchanged"
	Text string `json:"text"`
}

func ComputeLineDiff(oldText, newText string) []DiffLine {
	normOld := strings.TrimRight(strings.ReplaceAll(oldText, "\r\n", "\n"), "\n")
	normNew := strings.TrimRight(strings.ReplaceAll(newText, "\r\n", "\n"), "\n")

	if normOld == normNew {
		if normOld == "" {
			return []DiffLine{}
		}
		lines := strings.Split(normOld, "\n")
		res := make([]DiffLine, len(lines))
		for i, l := range lines {
			res[i] = DiffLine{Type: "unchanged", Text: l}
		}
		return res
	}

	var a, b []string
	if normOld != "" {
		a = strings.Split(normOld, "\n")
	}
	if normNew != "" {
		b = strings.Split(normNew, "\n")
	}

	n, m := len(a), len(b)
	dp := make([][]int, n+1)
	for i := range dp {
		dp[i] = make([]int, m+1)
	}

	for i := 0; i < n; i++ {
		for j := 0; j < m; j++ {
			if a[i] == b[j] {
				dp[i+1][j+1] = dp[i][j] + 1
			} else {
				if dp[i+1][j] > dp[i][j+1] {
					dp[i+1][j+1] = dp[i+1][j]
				} else {
					dp[i+1][j+1] = dp[i][j+1]
				}
			}
		}
	}

	var result []DiffLine
	i, j := n, m
	for i > 0 || j > 0 {
		if i > 0 && j > 0 && a[i-1] == b[j-1] {
			result = append(result, DiffLine{Type: "unchanged", Text: a[i-1]})
			i--
			j--
		} else if j > 0 && (i == 0 || dp[i][j-1] >= dp[i-1][j]) {
			result = append(result, DiffLine{Type: "added", Text: b[j-1]})
			j--
		} else if i > 0 && (j == 0 || dp[i][j-1] < dp[i-1][j]) {
			result = append(result, DiffLine{Type: "removed", Text: a[i-1]})
			i--
		}
	}

	// Reverse
	for l, r := 0, len(result)-1; l < r; l, r = l+1, r-1 {
		result[l], result[r] = result[r], result[l]
	}
	return result
}
