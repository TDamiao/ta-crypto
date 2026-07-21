# Roadmap

This roadmap separates released capabilities from planned work. GitHub issues are the detailed source for scope and acceptance criteria.

## Released

### v0.2.x

- Stateful RSI and session VWAP.
- Golden and external compatibility checks.
- Typed candle helpers and modular package entry points.

### v0.3.0

- Standardized candle and array input contracts.
- Stateful SMA and EMA with batch parity and reset coverage.
- Shared compatibility tolerance and warmup policy.

### v0.3.1

- Shared rolling sum, mean, standard-deviation, minimum, and maximum primitives.
- SMA and BBANDS rolling optimizations with deterministic benchmarks.

### v0.3.2

- Runnable RSI, session VWAP, funding, and external-reference examples.
- Trust and verification documentation.

### v0.3.3

- Focused package documentation for inputs, indicators, crypto utilities, stateful APIs, compatibility, and trust.
- Release Please automation as the single authority for versions, tags, GitHub Releases, and npm publication.

### v0.3.4

- Synchronize published version references and document the active Release Please flow and failure recovery.

## v0.4 focus

The v0.4 release is a core-hardening release, tracked by [issue #21](https://github.com/TDamiao/ta-crypto/issues/21).

Priorities:

1. Correct financial semantics and numeric domains.
2. Optimize remaining rolling indicators with parity benchmarks.
3. Expand stateful coverage with batch parity and deterministic reset.
4. Broaden independent compatibility evidence.
5. Harden package publication with trusted publishing, provenance, and supply-chain evidence.
6. Keep documentation synchronized with shipped behavior.

Basic candle resampling is not a v0.4 gate. It remains open for v0.5 or later in [issue #6](https://github.com/TDamiao/ta-crypto/issues/6).

## Future scope

The following proposals remain open but are not current package capabilities or v0.4 gates:

- backtest and portfolio accounting engine;
- complete multi-timeframe alignment;
- broad exchange and file adapters;
- first-class strategy APIs;
- multi-symbol screener.

## Contributing against the roadmap

1. Start from an open issue with evidence and acceptance criteria.
2. Keep one independently testable delivery per pull request.
3. Preserve mathematical parity for internal optimizations.
4. Update tests, benchmarks, and documentation in the same change when behavior is affected.
5. Do not document roadmap APIs as already available.
