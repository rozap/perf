defmodule Perf.Session do
  defstruct user: nil, token: nil

  def validate(params) do
    case Map.split(params, ["email", "password"]) do
      {login, %{}} -> {:ok, login}
      {_, missing} -> 
        error = missing 
        |> Enum.map(fn k, v -> {k, ["can't be blank"]} end) 
        |> Enum.into(%{})
        {:error, error}
    end
  end
end