{

  description = "claude-code-agent - Monitoring, visualization, and orchestration for Claude Code sessions";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/release-24.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      nixpkgs-unstable,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        pkgs-unstable = import nixpkgs-unstable { inherit system; };

        # Minimum required bun version
        minBunVersion = "1.0.0";

        # claude-code-agent package
        claude-code-agent = pkgs.stdenv.mkDerivation {
          pname = "claude-code-agent";
          version = "0.1.0";

          src = ./.;

          dontBuild = true;

          installPhase = ''
            runHook preInstall

            # Install source files
            mkdir -p $out/lib/claude-code-agent
            cp -r src $out/lib/claude-code-agent/
            cp -r bin $out/lib/claude-code-agent/
            cp package.json $out/lib/claude-code-agent/
            cp tsconfig.json $out/lib/claude-code-agent/

            # Create wrapper script
            mkdir -p $out/bin
            cat > $out/bin/claude-code-agent << 'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail

MIN_BUN_VERSION="${minBunVersion}"

# Function to compare version strings
version_ge() {
  # Returns 0 (true) if $1 >= $2
  local v1="$1"
  local v2="$2"

  # Split versions into arrays
  IFS='.' read -ra V1_PARTS <<< "$v1"
  IFS='.' read -ra V2_PARTS <<< "$v2"

  # Compare each part
  for i in 0 1 2; do
    local part1="''${V1_PARTS[$i]:-0}"
    local part2="''${V2_PARTS[$i]:-0}"

    # Remove any non-numeric suffix (e.g., "1" from "1-beta")
    part1="''${part1%%[^0-9]*}"
    part2="''${part2%%[^0-9]*}"

    if (( part1 > part2 )); then
      return 0
    elif (( part1 < part2 )); then
      return 1
    fi
  done
  return 0
}

# Check if bun is installed
if ! command -v bun &> /dev/null; then
  echo "Error: bun is not installed." >&2
  echo "" >&2
  echo "claude-code-agent requires bun >= $MIN_BUN_VERSION" >&2
  echo "" >&2
  echo "Install bun:" >&2
  echo "  - nix profile install nixpkgs#bun" >&2
  echo "  - or see https://bun.sh/" >&2
  exit 1
fi

# Get bun version
BUN_VERSION=$(bun --version 2>/dev/null || echo "0.0.0")

# Check version
if ! version_ge "$BUN_VERSION" "$MIN_BUN_VERSION"; then
  echo "Error: bun version $BUN_VERSION is too old." >&2
  echo "" >&2
  echo "claude-code-agent requires bun >= $MIN_BUN_VERSION" >&2
  echo "Current version: $BUN_VERSION" >&2
  echo "" >&2
  echo "Please upgrade bun:" >&2
  echo "  - bun upgrade" >&2
  exit 1
fi

# Get the directory where this script is installed
SCRIPT_DIR="$(cd "$(dirname "''${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$SCRIPT_DIR")/lib/claude-code-agent"

# Run claude-code-agent with bun
exec bun "$LIB_DIR/bin/claude-code-agent" "$@"
WRAPPER

            chmod +x $out/bin/claude-code-agent

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Monitoring, visualization, and orchestration for Claude Code sessions";
            homepage = "https://github.com/tacogips/claude-code-agent";
            license = licenses.mit;
            mainProgram = "claude-code-agent";
          };
        };

        devPackages = with pkgs; [
          # Bun runtime
          pkgs-unstable.bun

          # Node.js runtime
          pkgs-unstable.nodejs

          # TypeScript tooling
          pkgs-unstable.typescript
          pkgs-unstable.typescript-language-server
          nodePackages.prettier

          # Development tools
          fd
          gnused
          gh
          go-task
        ];

      in
      {
        packages = {
          default = claude-code-agent;
          claude-code-agent = claude-code-agent;
        };

        devShells.default = pkgs.mkShell {
          packages = devPackages;

          shellHook = ''
            # Fix for Zed editor on NixOS: Zed downloads its own dynamically linked
            # Node.js binary which cannot run on NixOS. Replace it with a symlink to
            # the Nix-provided Node.js.
            ZED_NODE_DIR="$HOME/.local/share/zed/node"
            if [ -d "$ZED_NODE_DIR" ]; then
              NIX_NODE="$(which node)"
              if [ -n "$NIX_NODE" ]; then
                for node_bin in "$ZED_NODE_DIR"/node-*/bin/node; do
                  if [ -e "$node_bin" ] || [ -L "$node_bin" ]; then
                    if [ "$(readlink -f "$node_bin" 2>/dev/null)" != "$(readlink -f "$NIX_NODE")" ]; then
                      echo "Patching Zed node binary: $node_bin -> $NIX_NODE"
                      ln -sf "$NIX_NODE" "$node_bin"
                    fi
                  fi
                done
              fi
            fi

            echo "TypeScript development environment ready"
            echo "Bun version: $(bun --version)"
            echo "Node.js version: $(node --version)"
            echo "TypeScript version: $(tsc --version)"
            echo "Task version: $(task --version 2>/dev/null || echo 'not available')"
          '';
        };
      }
    );
}
