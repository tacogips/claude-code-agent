{

  description = "peeper";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/release-25.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks.url = "github:cachix/git-hooks.nix";
    divedra = {
      url = "github:tacogips/divedra/main";
      inputs.flake-utils.follows = "flake-utils";
      inputs.git-hooks.follows = "git-hooks";
      inputs.nixpkgs-unstable.follows = "nixpkgs-unstable";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      nixpkgs-unstable,
      flake-utils,
      git-hooks,
      divedra,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        pkgs-unstable = import nixpkgs-unstable { inherit system; };

        divedraCli = pkgs.writeShellApplication {
          name = "divedra";
          runtimeInputs = [
            pkgs-unstable.bun
            pkgs.nodejs_22
          ];
          text = ''
            set -euo pipefail

            invocation_cwd="$PWD"
            source_dir="${divedra}"
            cache_root="''${XDG_CACHE_HOME:-$HOME/.cache}/divedra/claude-code-agent-nix"
            source_key="''${source_dir##*/}"
            runtime_root="$cache_root/$source_key"
            runtime_src="$runtime_root/src"
            ready_file="$runtime_root/.build-ready"
            source_file="$runtime_root/.source-path"

            cached_source=""
            if [ -f "$source_file" ]; then
              IFS= read -r cached_source < "$source_file" || cached_source=""
            fi

            mkdir -p "$cache_root"

            if [ ! -f "$ready_file" ] || [ "$cached_source" != "$source_dir" ]; then
              if [ -d "$runtime_root" ]; then
                chmod -R u+w "$runtime_root" 2>/dev/null || true
              fi
              rm -rf "$runtime_root"
              mkdir -p "$runtime_src"
              cp -R "$source_dir"/. "$runtime_src"
              chmod -R u+w "$runtime_root"
              (
                cd "$runtime_src"
                bun install --frozen-lockfile
                bun build packages/divedra-addons/src/index.ts --outfile packages/divedra-addons/dist/index.js --target bun
              )
              printf '%s\n' "$source_dir" > "$source_file"
              touch "$ready_file"
            fi

            cd "$invocation_cwd"
            exec bun run "$runtime_src/src/main.ts" "$@"
          '';
        };

        preCommitCheck = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            gitleaks = {
              enable = true;
              name = "gitleaks";
              entry = "${pkgs.lib.getExe pkgs.gitleaks} git --pre-commit --redact --staged --verbose";
              language = "system";
              pass_filenames = false;
            };
          };
        };

        devPackages = (with pkgs; [
          # Bun runtime
          pkgs-unstable.bun

          # TypeScript tooling
          pkgs-unstable.typescript
          pkgs-unstable.typescript-language-server
          nodePackages.prettier

          # Rust-based JS/TS linter used by repository lint tasks.
          pkgs-unstable.biome

          # Development tools
          fd
          gnused
          gh
          go-task
          gitleaks
          divedraCli
        ]) ++ preCommitCheck.enabledPackages;

      in
      {
        checks.pre-commit-check = preCommitCheck;

        devShells.default = pkgs.mkShell {
          packages = devPackages;

          shellHook = ''
            ${preCommitCheck.shellHook}

            echo "TypeScript development environment ready"
            echo "Bun version: $(bun --version)"
            echo "TypeScript version: $(tsc --version)"
            echo "Biome version: $(biome --version 2>/dev/null || echo 'not available')"
            echo "Task version: $(task --version 2>/dev/null || echo 'not available')"
            echo "Gitleaks version: $(gitleaks version 2>/dev/null || echo 'not available')"
          '';
        };
      }
    );
}
