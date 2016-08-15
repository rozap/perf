defmodule Perf.Run do
  use Perf.Web, :model

  schema "runs" do
    belongs_to :suite, Perf.Suite

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [])
    |> validate_required([])
  end
end
