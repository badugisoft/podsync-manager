package storage

import (
	"context"
	"errors"
	"io/fs"
	"math"
	"os"
	"path/filepath"

	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/badugisoft/podsync-manager/internal/config"
	"github.com/badugisoft/podsync-manager/internal/docker"
)

type StorageUsage struct {
	TotalBytes           int64   `json:"totalBytes"`
	TotalGigabytes       float64 `json:"totalGigabytes"`
	FileCount            int     `json:"fileCount"`
	PercentageOfFreeTier float64 `json:"percentageOfFreeTier"`
	StorageType          string  `json:"storageType"`
}

func getDirectorySize(dirPath string) (int64, int, error) {
	var totalBytes int64
	var fileCount int

	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if !d.IsDir() {
			info, err := d.Info()
			if err == nil {
				totalBytes += info.Size()
				fileCount++
			}
		}
		return nil
	})
	return totalBytes, fileCount, err
}

func CalculateStorageUsage(ctx context.Context) (*StorageUsage, error) {
	cfg, _, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	// 1. Local storage mode
	if cfg.Storage != nil && cfg.Storage.Type == "local" {
		localDir := "/app/data"
		if cfg.Server != nil && cfg.Server.DataDir != "" {
			localDir = cfg.Server.DataDir
		}

		totalBytes, fileCount, _ := getDirectorySize(localDir)
		totalGB := math.Round(float64(totalBytes)/(1024*1024*1024)*100) / 100
		pct := math.Round(math.Min((totalGB/10.0)*100.0, 100.0)*10) / 10

		return &StorageUsage{
			TotalBytes:           totalBytes,
			TotalGigabytes:       totalGB,
			FileCount:            fileCount,
			PercentageOfFreeTier: pct,
			StorageType:          "local",
		}, nil
	}

	// 2. S3 mode
	containerEnv := docker.GetPodsyncEnv(ctx)
	s3Config := cfg.Storage.S3

	endpoint := os.Getenv("AWS_ENDPOINT")
	if endpoint == "" && s3Config != nil {
		endpoint = s3Config.EndpointURL
	}
	if endpoint == "" {
		endpoint = containerEnv["AWS_ENDPOINT"]
	}

	accessKeyID := os.Getenv("AWS_ACCESS_KEY_ID")
	if accessKeyID == "" {
		accessKeyID = containerEnv["AWS_ACCESS_KEY_ID"]
	}
	if accessKeyID == "" {
		accessKeyID = containerEnv["AWS_ACCESS_KEY"]
	}

	secretAccessKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	if secretAccessKey == "" {
		secretAccessKey = containerEnv["AWS_SECRET_ACCESS_KEY"]
	}
	if secretAccessKey == "" {
		secretAccessKey = containerEnv["AWS_SECRET_KEY"]
	}

	bucket := "podsync-data"
	if s3Config != nil && s3Config.Bucket != "" {
		bucket = s3Config.Bucket
	} else if b := containerEnv["AWS_BUCKET"]; b != "" {
		bucket = b
	}

	region := "auto"
	if s3Config != nil && s3Config.Region != "" {
		region = s3Config.Region
	} else if r := containerEnv["AWS_REGION"]; r != "" {
		region = r
	}

	if accessKeyID == "" || secretAccessKey == "" {
		return nil, errors.New("ERR_S3_CREDENTIALS_MISSING")
	}

	creds := credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")
	awsCfg, err := awsConfig.LoadDefaultConfig(ctx,
		awsConfig.WithRegion(region),
		awsConfig.WithCredentialsProvider(creds),
	)
	if err != nil {
		return nil, err
	}

	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if endpoint != "" {
			o.BaseEndpoint = &endpoint
		}
		if s3Config != nil && s3Config.ForcePathStyle != nil {
			o.UsePathStyle = *s3Config.ForcePathStyle
		}
	})

	var totalBytes int64
	var fileCount int
	var continuationToken *string

	for {
		input := &s3.ListObjectsV2Input{
			Bucket:            &bucket,
			ContinuationToken: continuationToken,
		}

		output, err := s3Client.ListObjectsV2(ctx, input)
		if err != nil {
			return nil, err
		}

		for _, item := range output.Contents {
			if item.Size != nil {
				totalBytes += *item.Size
			}
			fileCount++
		}

		if !*output.IsTruncated {
			break
		}
		continuationToken = output.NextContinuationToken
	}

	totalGB := math.Round(float64(totalBytes)/(1024*1024*1024)*100) / 100
	pct := math.Round(math.Min((totalGB/10.0)*100.0, 100.0)*10) / 10

	return &StorageUsage{
		TotalBytes:           totalBytes,
		TotalGigabytes:       totalGB,
		FileCount:            fileCount,
		PercentageOfFreeTier: pct,
		StorageType:          "s3",
	}, nil
}
