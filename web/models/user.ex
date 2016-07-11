defmodule Perf.User do
  use Perf.Web, :model

  schema "users" do
    field :email, :string
    field :password, :string

    timestamps()
  end

  def hash_password(password) do
    Comeonin.Pbkdf2.hashpwsalt(password)
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:email, :password])
    |> validate_required([:email, :password])
    |> unique_constraint(:email)
    |> validate_length(:password, min: 6)
    |> update_change(:password, &(hash_password &1))
  end

  defimpl Poison.Encoder, for: Perf.User do
    @attributes ~W(id email inserted_at updated_at)a

    def encode(user, _options) do
      user
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end
