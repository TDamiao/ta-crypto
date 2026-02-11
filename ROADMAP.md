# Roadmap

This roadmap is intentionally short and contribution-oriented.

## v0.2

- Streaming API (RSI, EMA, SMA)
- Golden tests vs TA-Lib
- Benchmark suite

## v0.3 (Release gates)

`ta-crypto@0.3.0` only ships after all gate issues are closed:
- [#2](https://github.com/TDamiao/ta-crypto/issues/2) Streaming/Stateful API (real-time first)
- [#3](https://github.com/TDamiao/ta-crypto/issues/3) Numeric validation and compatibility proof
- [#7](https://github.com/TDamiao/ta-crypto/issues/7) API typing and developer UX

Meta tracking issue:
- [#8](https://github.com/TDamiao/ta-crypto/issues/8) v0.3 Release Gate

### Why these gates

1. Streaming/stateful APIs enable direct websocket integrations and real-time strategies.
2. Compatibility proofs against TA-Lib turn correctness into an explicit contract.
3. Public typing + input ergonomics reduce onboarding friction and API misuse.

## How to contribute against roadmap

1. Pick one item.
2. Open or claim a guided issue.
3. Ship code + tests + short benchmark/docs update.
