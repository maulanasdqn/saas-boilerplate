{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    nodejs_22
    corepack_22
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    corepack.enable = true;
  };

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    port = 5432;
    listen_addresses = "127.0.0.1";
    initialDatabases = [{ name = "tanstack_start_dev"; }];
    initialScript = ''
      CREATE USER tanstack WITH PASSWORD 'tanstack' CREATEDB;
      GRANT ALL PRIVILEGES ON DATABASE tanstack_start_dev TO tanstack;
      ALTER DATABASE tanstack_start_dev OWNER TO tanstack;
    '';
  };

  env.DATABASE_URL = "postgresql://tanstack:tanstack@127.0.0.1:5432/tanstack_start_dev";
  env.BETTER_AUTH_URL = "http://localhost:3000";

  processes = {
    dev.exec = "pnpm dev";
  };
}
