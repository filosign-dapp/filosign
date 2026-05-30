/**
 * PieceCID (Piece Commitment CID) utilities
 *
 * Helper functions for working with Filecoin Piece CIDs
 */
import type { PieceLink as PieceCIDType } from "@web3-storage/data-segment";
import * as Hasher from "@web3-storage/data-segment/multihash";

import * as Raw from "multiformats/codecs/raw";
import * as Link from "multiformats/link";

export type PieceCID = PieceCIDType;

export function calculatePieceCid(data: Uint8Array): PieceCID {
	// TODO: consider https://github.com/storacha/fr32-sha2-256-trunc254-padded-binary-tree-multihash
	// for more efficient PieceCID calculation in WASM
	const hasher = Hasher.create();
	// We'll get slightly better performance by writing in chunks to let the
	// hasher do its work incrementally
	const chunkSize = 2048;
	for (let i = 0; i < data.length; i += chunkSize) {
		hasher.write(data.subarray(i, i + chunkSize));
	}
	const digest = hasher.digest();
	return Link.create(Raw.code, digest);
}
