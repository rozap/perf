defmodule Perf.Repo.Migrations.AddFinishedAt do
  use Ecto.Migration

  def change do
    alter table(:runs) do
      add :finished_at, :datetime
    end
  end
end
