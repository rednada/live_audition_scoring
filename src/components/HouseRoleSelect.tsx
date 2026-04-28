"use client";
import { useState, useEffect, useRef } from "react";
import useSWR from "swr";

interface House {
  id: number;
  name: string;
  roles: { id: number; name: string }[];
}

interface HouseRoleSelectProps {
  house: string;
  role: string;
  onHouseChange: (h: string) => void;
  onRoleChange: (r: string) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function HouseRoleSelect({
  house,
  role,
  onHouseChange,
  onRoleChange,
}: HouseRoleSelectProps) {
  const { data: houses } = useSWR<House[]>("/api/houses", fetcher);
  const [roleInput, setRoleInput] = useState(role);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedHouse = houses?.find((h) => h.name === house);
  const filteredRoles = selectedHouse?.roles.filter((r) =>
    r.name.toLowerCase().includes(roleInput.toLowerCase())
  ) ?? [];

  useEffect(() => {
    setRoleInput(role);
  }, [role]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex gap-2 flex-wrap">
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">House</label>
        <select
          value={house}
          onChange={(e) => {
            onHouseChange(e.target.value);
            onRoleChange("");
            setRoleInput("");
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
        >
          <option value="">选择 House</option>
          {houses?.map((h) => (
            <option key={h.id} value={h.name}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {house && (
        <div className="relative" ref={dropdownRef}>
          <label className="text-xs text-gray-500 block mb-0.5">Role</label>
          <input
            type="text"
            value={roleInput}
            onChange={(e) => {
              setRoleInput(e.target.value);
              onRoleChange(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="输入搜索 Role..."
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400 w-40"
          />
          {showDropdown && filteredRoles.length > 0 && (
            <div className="absolute top-full left-0 z-10 bg-white border border-gray-200 rounded shadow-md max-h-40 overflow-auto w-48">
              {filteredRoles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
                  onClick={() => {
                    setRoleInput(r.name);
                    onRoleChange(r.name);
                    setShowDropdown(false);
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
