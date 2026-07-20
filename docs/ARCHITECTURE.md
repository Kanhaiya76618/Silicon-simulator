# Architecture boundaries

`frontend` communicates with `backend` only through types in `packages/shared`. Browser-only execution belongs in `packages/simulator`; VCD decoding and waveform layout belong in `packages/vcd-core`. The API must not import browser packages, and the web app must not access database code.

## Collaboration rule

Before changing a contract, make the compatible change in `packages/shared` first. Feature work stays within its owning directory; cross-cutting changes require a short ADR under `docs/adr/`.
