package main

import (
	"fmt"
	"log"
	"os"

	badger "github.com/dgraph-io/badger"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage: dbtool <db_path> <feed_id> [episode_id]")
		os.Exit(1)
	}
	dbPath := os.Args[1]
	feedID := os.Args[2]
	episodeID := ""
	if len(os.Args) >= 4 {
		episodeID = os.Args[3]
	}

	opts := badger.DefaultOptions(dbPath)
	db, err := badger.Open(opts)
	if err != nil {
		log.Fatalf("failed to open badger: %v", err)
	}
	defer db.Close()

	count := 0
	err = db.Update(func(txn *badger.Txn) error {
		if episodeID != "" {
			// 단일 에피소드 키 삭제
			key := []byte(fmt.Sprintf("podsync/v1/episode/%s/%s", feedID, episodeID))
			if err := txn.Delete(key); err == nil {
				fmt.Printf("Deleted episode key: %s\n", string(key))
				count++
			}
			return nil
		}

		// 피드 전체 에피소드 및 피드 메타데이터 키 삭제
		feedKey := []byte(fmt.Sprintf("podsync/v1/feed/%s", feedID))
		_ = txn.Delete(feedKey)

		prefix := []byte(fmt.Sprintf("podsync/v1/episode/%s/", feedID))
		itOpts := badger.DefaultIteratorOptions
		itOpts.Prefix = prefix
		itOpts.PrefetchValues = false
		it := txn.NewIterator(itOpts)
		defer it.Close()

		var toDelete [][]byte
		for it.Seek(prefix); it.Valid(); it.Next() {
			item := it.Item()
			key := item.KeyCopy(nil)
			toDelete = append(toDelete, key)
		}
		for _, k := range toDelete {
			fmt.Printf("Deleted episode key: %s\n", string(k))
			if err := txn.Delete(k); err != nil {
				return err
			}
			count++
		}
		return nil
	})
	if err != nil {
		log.Fatalf("failed to update badger: %v", err)
	}
	fmt.Printf("Successfully deleted %d keys for feed: %s\n", count, feedID)
}
