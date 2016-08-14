defmodule Perf.Repo.Migrations.GuardianSessions do
  use Ecto.Migration

  def up do
    create table(:tokens, primary_key: false) do
      add :jti, :string, primary_key: true
      add :typ, :string
      add :aud, :string
      add :iss, :string
      add :sub, :string
      add :exp, :bigint
      add :jwt, :text
      add :claims, :map
      timestamps
    end
    create unique_index(:tokens, [:jti, :aud])
  end

  def down do
    drop table(:tokens)
  end
end
