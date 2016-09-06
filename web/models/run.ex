defmodule Perf.Run do
  use Perf.Web, :model

  schema "runs" do
    belongs_to :suite, Perf.Suite
    field :yam_ref, :string
    field :finished_at, Ecto.DateTime
    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    {_, params} = Map.get_and_update(params, "yam_ref", fn
      nil -> {nil, UUID.uuid1()}
      ref -> {ref, ref}
    end)

    struct
    |> cast(params, [:suite_id, :yam_ref])
    |> validate_required([:suite_id, :yam_ref])
  end


  defimpl Poison.Encoder, for: Perf.Run do
    @attributes ~W(id inserted_at updated_at finished_at suite yam_ref)a

    def encode(run, _options) do
      run
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end
