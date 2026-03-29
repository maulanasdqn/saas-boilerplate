{
  description = "SaaS Boilerplate — dev environment with PostgreSQL";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in {
      devShells = forEachSystem (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          pgPort = "5432";
          dbName = "tanstack_start_dev";
          dbUser = "tanstack";
          dbPass = "tanstack";
        in {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              corepack_22
              postgresql_17
            ];

            DATABASE_URL = "postgresql://${dbUser}:${dbPass}@127.0.0.1:${pgPort}/${dbName}";

            shellHook = ''
              export PGPORT="${pgPort}"
              export PGDATA="$HOME/.postgres-saas"
              export PGHOST="127.0.0.1"
              export PGLOGFILE="$PGDATA/logfile"

              # Init data dir if needed
              if [ ! -d "$PGDATA" ]; then
                echo "Initialising PostgreSQL data dir at $PGDATA..."
                initdb -D "$PGDATA" --no-locale --encoding=UTF8 -A trust \
                  --username=postgres -q
                echo "listen_addresses = '127.0.0.1'" >> "$PGDATA/postgresql.conf"
                echo "port = ${pgPort}" >> "$PGDATA/postgresql.conf"
              fi

              # Start postgres if not already running
              if ! pg_isready -q -h 127.0.0.1 -p ${pgPort}; then
                echo "Starting PostgreSQL on port ${pgPort}..."
                pg_ctl -D "$PGDATA" -l "$PGLOGFILE" start -w -o "-p ${pgPort}" -o "-h 127.0.0.1"
              fi

              # Ensure the role and database exist
              psql -h 127.0.0.1 -p ${pgPort} -d postgres -tc \
                "SELECT 1 FROM pg_roles WHERE rolname='${dbUser}'" \
                | grep -q 1 || \
                psql -h 127.0.0.1 -p ${pgPort} -d postgres \
                  -c "CREATE USER ${dbUser} WITH PASSWORD '${dbPass}' CREATEDB;"

              psql -h 127.0.0.1 -p ${pgPort} -d postgres -tc \
                "SELECT 1 FROM pg_database WHERE datname='${dbName}'" \
                | grep -q 1 || \
                psql -h 127.0.0.1 -p ${pgPort} -d postgres \
                  -c "CREATE DATABASE ${dbName} OWNER ${dbUser};"

              export DATABASE_URL="postgresql://${dbUser}:${dbPass}@127.0.0.1:${pgPort}/${dbName}"
              echo "✓ PostgreSQL ready — $DATABASE_URL"
            '';
          };
        });
    };
}
