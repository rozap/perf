defmodule Perf.Repo.Migrations.AddRequestGroup do
  use Ecto.Migration

  def change do
    alter table(:requests) do
      add :group, :integer
    end
  end
end
