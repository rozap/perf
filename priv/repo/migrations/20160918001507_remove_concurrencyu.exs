defmodule Perf.Repo.Migrations.RemoveConcurrencyu do
  use Ecto.Migration

  def change do
    alter table(:requests) do
      remove :concurrency
      remove :runlength

    end
  end
end
